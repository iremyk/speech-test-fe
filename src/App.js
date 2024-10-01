import React, { useState, useRef } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [speechResponse, setSpeechResponse] = useState("");
  const [speechDuration, setSpeechDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const processorRef = useRef(null);
  const chunksRef = useRef([]);
  const BASE_URL = "https://speech-test-webapp.azurewebsites.net"; // Update this with your server URL

  // Handle file upload
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // Handle file upload for Azure Speech to Text endpoint
  const handleSpeechUpload = async () => {
    if (!selectedFile) return alert("Please select a file first!");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/speech`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSpeechResponse(response.data["speech_response"]);
      setSpeechDuration(response.data["process_duration"]);
    } catch (error) {
      console.error("Error with Speech API", error);
      alert("Error with Speech API");
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert audio buffer to WAV file
  const convertToWav = (audioBuffer) => {
    const numOfChannels = audioBuffer.numberOfChannels,
      length = audioBuffer.length * numOfChannels * 2 + 44,
      buffer = new ArrayBuffer(length),
      view = new DataView(buffer),
      channels = [],
      sampleRate = audioBuffer.sampleRate;

    let pos = 0; // Changed to let to allow reassignment
    let offset = 0; // Changed to let to allow reassignment

    // Write WAV file header
    function setUint16(data) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data) {
      view.setUint32(pos, data, true);
      pos += 4;
    }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // File size
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // PCM format
    setUint16(1); // Format (1: PCM)
    setUint16(numOfChannels);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChannels); // Byte rate
    setUint16(numOfChannels * 2); // Block align
    setUint16(16); // Bits per sample
    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4); // Data size

    // Write audio data
    for (let i = 0; i < numOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChannels; i++) {
        const sample = Math.max(-1, Math.min(1, channels[i][offset])); // Clamp the value
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); // Convert to 16-bit PCM
        pos += 2;
      }
      offset++;
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  // Handle microphone recording
  const handleMicInputSpeech = async () => {
    let audioContext;
    let mediaStream;
    let mediaStreamSource;
    let processor;

    try {
      // Step 1: Access the microphone
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Step 2: Initialize the Audio Context and Processor
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);

      // Create a ScriptProcessorNode to capture the audio buffer
      processor = audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(inputData)); // Store the recorded chunks
      };

      // Step 3: Connect the media source to the processor and start recording
      mediaStreamSource.connect(processor);
      processor.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      mediaStreamSourceRef.current = mediaStreamSource;
      processorRef.current = processor;
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone", error);
      alert("Error accessing microphone");
    }
  };

  const stopRecording = async () => {
    const audioContext = audioContextRef.current;
    const mediaStreamSource = mediaStreamSourceRef.current;
    const processor = processorRef.current;

    if (audioContext && mediaStreamSource && processor) {
      // Step 4: Stop recording
      processor.disconnect();
      mediaStreamSource.disconnect();
      audioContext.close();

      // Step 5: Convert the audio buffer to a WAV file
      const audioBuffer = audioContext.createBuffer(1, chunksRef.current.length * 4096, audioContext.sampleRate);
      for (let i = 0; i < chunksRef.current.length; i++) {
        audioBuffer.copyToChannel(chunksRef.current[i], 0, i * 4096);
      }
      const wavBlob = convertToWav(audioBuffer);

      // Step 6: Send the WAV file to the server
      const audioFile = new File([wavBlob], "micRecording.wav", {
        type: "audio/wav",
      });
      const formData = new FormData();
      formData.append("file", audioFile);

      try {
        setLoading(true);
        const response = await axios.post(`${BASE_URL}/speech`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSpeechResponse(response.data["speech_response"]);
        setSpeechDuration(response.data["process_duration"]);
      } catch (error) {
        console.error("Error with Speech API /speech", error);
        alert("Error with /speech API");
      } finally {
        setLoading(false);
        setIsRecording(false);
      }
    } else {
      console.error("Recording was not initialized properly.");
      alert("Error: Recording was not initialized properly.");
    }
  };

  const startRecording = async () => {
    chunksRef.current = []; // Reset chunks before starting
    await handleMicInputSpeech();
  };



  return (
    <div className="app-container">
      <h1>Audio Transcription Test</h1>

      <input type="file" accept="audio/*" onChange={handleFileChange} className="file-input" />
      <button onClick={handleSpeechUpload} className="button" disabled={loading}>
          Test Speech to Text with Upload
      </button>
      <div className="button-group">
        <button onClick={startRecording} className="button" disabled={loading || isRecording}>
          Start Recording
        </button>
        <button onClick={stopRecording} className="button" disabled={loading || !isRecording}>
          Stop Recording
        </button>
      </div>

      {loading && <p className="loading">Processing...</p>}

      <h3>Speech to Text Response:</h3>
      <p className="response-text">{speechResponse}</p>
      <p className="process-duration">Processing time: {speechDuration}</p>
    </div>
  );
};

export default App;
