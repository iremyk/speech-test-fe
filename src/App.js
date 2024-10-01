import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [whisperResponse, setWhisperResponse] = useState("");
  const [speechResponse, setSpeechResponse] = useState("");
  const [whisperDuration, setWhisperDuration] = useState("");
  const [speechDuration, setSpeechDuration] = useState("");
  const [loading, setLoading] = useState(false);
const BASE_URL = "https://speech-test-webapp.azurewebsites.net/"; // Update this with your server URL

  // Handle file upload
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // Handle file upload for Whisper endpoint
  const handleWhisperUpload = async () => {
    if (!selectedFile) return alert("Please select a file first!");
    
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setLoading(true);
      const response = await axios.post(`${BASE_URL}/whisper`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log(response.data);
      setWhisperResponse(response.data["whisper_response"]);
      setWhisperDuration(response.data["process_duration"]);
    } catch (error) {
      console.error("Error with Whisper API", error);
      alert("Error with Whisper API");
    } finally {
      setLoading(false);
    }
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

  // Handle microphone recording (for Whisper)
  const handleMicInputWhisper = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    let chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      const audioFile = new File([blob], "micRecording.wav", {
        type: "audio/wav",
      });

      const formData = new FormData();
      formData.append("file", audioFile);

      try {
        setLoading(true);
        const response = await axios.post(`${BASE_URL}/whisper`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setWhisperResponse(response.data["whisper_response"]);
        setWhisperDuration(response.data["process_duration"]);
      } catch (error) {
        console.error("Error with Whisper API", error);
        alert("Error with Whisper API");
      } finally {
        setLoading(false);
      }
    };

    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000); // Stop recording after 5 seconds
  };

  // Handle microphone recording (for Azure Speech)
const handleMicInputSpeech = async () => {
  try {
    setLoading(true);
    const response = await axios.post(`${BASE_URL}/speech2`);
    setSpeechResponse(response.data["speech_response"]);
    setSpeechDuration(response.data["process_duration"]);
  } catch (error) {
    console.error("Error with Speech API /speech2", error);
    alert("Error with /speech2 API");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="app-container">
      <h1>Audio Transcription Test</h1>
      
      <input type="file" accept="audio/*" onChange={handleFileChange} className="file-input"/>
      <div className="button-group">
        {/* <button onClick={handleWhisperUpload} className="button" disabled={loading}>
          Test Whisper with Upload
        </button> */}
        <button onClick={handleSpeechUpload} className="button" disabled={loading}>
          Test Speech to Text with Upload
        </button>
      </div>
      <div className="button-group">
        {/* <button onClick={handleMicInputWhisper} className="button" disabled={loading}>
          Record & Transcribe (Whisper)
        </button> */}
        <button onClick={handleMicInputSpeech} className="button" disabled={loading}>
          Record & Transcribe (Azure Speech)
        </button>
      </div>

      {loading && <p className="loading">Processing...</p>}

      {/* <h3>Whisper Response:</h3>
      <p className="response-text">{whisperResponse}</p>
      <p className="process-duration">Processing time: {whisperDuration}</p> */}

      <h3>Speech to Text Response:</h3>
      <p className="response-text">{speechResponse}</p>
      <p className="process-duration">Processing time: {speechDuration}</p>
    </div>
  );
};
export default App;
