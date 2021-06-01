'use strict';

const express = require('express');
const app = express();
const port = 3000;

const cors = require('cors')

// Node-Record-lpcm16
const recorder = require('node-record-lpcm16');
let recording = null;
// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');

async function speechFunction(res) {
    const encoding = 'LINEAR16';
    const sampleRateHertz = 16000;
    const languageCode = 'en-US';
    // const command_and_search = 'command_and_search';
    // const keywords = ['turn on', 'turn off', 'turn it on', 'turn it off'];

    const request = {
        config: {
            encoding: encoding,
            sampleRateHertz: sampleRateHertz,
            languageCode: languageCode,
            // model: command_and_search,
            // speech_contexts: keywords
        },
        singleUtterance: true,
        interimResults: false // If you want interim results, set this to true
    };

    let isSent = false;
    // Creates a client
    const client = new speech.SpeechClient();
    // Create a recognize stream
    const recognizeStream = client
        .streamingRecognize(request)
        .on('error', console.error)
        .on('data', data => {
            // process.stdout.write(
            if (data.results[0] && data.results[0].alternatives[0]) {
                console.log(`Transcription: ${data.results[0].alternatives[0].transcript}\n`);
                isSent = true;
                recording.stop();
                res.send({ text: data.results[0].alternatives[0].transcript });
            }
            else {
                console.log(`\n\nReached transcription time limit, press Ctrl+C\n`);
                return "Error";
            }
        });
    // Start recording and send the microphone input to the Speech API
    recording = recorder
        .record({
            sampleRateHertz: sampleRateHertz,
            threshold: 0, //silence threshold
            recordProgram: 'sox', // Try also "arecord" or "sox"
            silence: '1.0', //seconds of silence before ending
            endOnSilence: true,
            thresholdEnd: 0.5
        })
    recording.stream()
        .on('error', console.error)
        .pipe(recognizeStream)
        .on("end", function () {
            if (!isSent)
                res.send({ text: "", status: "stopped" });
        });

    console.log('Listening, press Ctrl+C to stop.');
    // [END micStreamRecognize]
}

app.use(cors());

app.get('/api/speech-to-text/', function (req, res) {
    speechFunction(res, function (err) {
        if (err) {
            console.log('Error retrieving transcription: ', err);
            res.status(500).send('Error 500');
            return;
        }
    })
});
app.post('/api/speech-to-text/', function (req, res) {
    if (recording != null) {
        recording.stop();
        res.send({ status: "stopped" });
    } else {
        res.error("error stopping the record");
    }
});


app.listen(port, () => {
    console.log(`Listening on port: ${port}, at http://localhost:${port}/`);
});