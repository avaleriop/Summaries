const express = require('express');
const multer = require('multer');
const axios = require('axios').default;
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

const SECRET_KEY = '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';

const getTranscription = async (audioFile) => {
  try {
    console.log('Transcribiendo audio...');
    const fileStream = fs.createReadStream(audioFile.path);
    const form = new FormData();
    form.append('file', fileStream, audioFile.originalname);
    form.append('model', 'whisper-1');
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      {
        headers: {
          Authorization: `Bearer ${SECRET_KEY}`,
          ...form.getHeaders(),
        },
      }
    );
    console.log('Transcripción completada');
    return response.data.text;
  } catch (error) {
    console.error('Error al realizar la solicitud:', error.message);
    console.error('Respuesta de la API:', error.response && error.response.data);
    throw error;
  }
};

const getSummary = async (text) => {
  try {
    console.log('Generando resumen...');
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        model: "text-davinci-003",
        prompt: `Resumir las ideas principales de la siguiente transcripción:\n\n${text}\n\nResumen:`,
        max_tokens: 300,
        n: 1,
        stop: null,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${SECRET_KEY}`,
        },
      }
    );
    console.log('Resumen generado');
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error('Error al generar el resumen:', error.message);
    console.error('Respuesta de la API:', error.response && error.response.data);
    throw error;
  }
};

app.post('/upload', upload.single('file'), async (req, res) => {
  console.log('Cliente conectado');
  try {
    const audioFile = req.file;
    const transcriptionText = await getTranscription(audioFile);
    const summary = await getSummary(transcriptionText);
    fs.unlinkSync(audioFile.path); // Elimina el archivo temporal
    //console.log(`Transcripción:\n${transcriptionText}`);
    //console.log(`Resumen de las ideas principales:\n${summary}`);
    res.json({ transcription: transcriptionText, summary: summary });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al procesar la transcripción y el resumen');
  }
  console.log('Cliente desconectado');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
