import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState } from 'react';
import RecordRTC, { MediaStreamRecorder } from 'recordrtc';

//const detectorOptions = new faceapi.TinyFaceDetectorOptions()
const detectorOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 1 })

export default function () {
  const fragmentCount: number = 4;

  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [fragmentNumber, setFragmentNumber] = useState<number>(0)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [facePrompt, setFacePrompt] = useState<string | null>()
  
  const [recorder, setRecorder] = useState<MediaRecorder>();
  const [time, setTime] = useState<number>(0);
  const [video, setVideo] = useState<Blob>();

  const [faceOnCamera, setFaceOnCamera] = useState<boolean>(false)
  const [faceTime, setFaceTime] = useState<number>(0)

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);


  useEffect(() => {
    if (time == 0) return;

    const timer = setTimeout(recordVideoHandler, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [time])

  useEffect(() => {
    const timer = setTimeout(async () => {
      setFaceTime(prevTime => prevTime + 1)
      const result = await isFaceOnCamera()
      console.log('face', result)
      setFaceOnCamera(result)
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [faceTime])

  useEffect(() => {
    if (!isRecording && fragmentNumber >= fragmentCount) {
      const recordedBlob = new Blob(recordedChunks, {
        type: 'video/mp4',
      })

      setVideo(recordedBlob)
      setFragmentNumber(0)
    }
  }, [isRecording, recordedChunks])

  const clearVideo = () => {
    setVideo(undefined)
  }

  const initRecorder = async () => {
    try {
      //await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');

      getMediaStreamFromCamera().then(async (stream: MediaStream) => {
        console.log('Видео захват включен')
        
        const recorder = getRecorder(stream)
        mediaRecorderRef.current = recorder;
        setRecorder(recorder)
        setFaceTime(prevTime => prevTime + 1)
      });
      console.log('Модели загружены успешно');
    } catch (error) {
      console.error('Ошибка при загрузке моделей:', error);
    }
  }

  const isFaceOnCamera = async (): Promise<boolean> => {
    const face = await faceapi.detectSingleFace(videoRef.current!, detectorOptions)
      //.withFaceLandmarks()
      //.withFaceExpressions()
      if (face) {
        drawFaceOutline(face);
      }
    
    return face !== undefined
  }

  const drawFaceOutline = (face: faceapi.FaceDetection) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displaySize = { width: videoRef.current!.videoWidth, height: videoRef.current!.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const resizedDetection = faceapi.resizeResults(face, displaySize);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.setLineDash([5, 5]);

    const box = resizedDetection.box;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const radiusX = box.width / 2 + box.width * 0.3;
    const radiusY = box.height / 2 + box.height * 0.3;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const getMediaStreamFromCamera = async (): Promise<MediaStream> => {
    const constraints: any = { audio: false, video: { facingMode: 'user', resizeMode: 'crop-and-scale' } };
    
    if (window.innerWidth > window.innerHeight) constraints.video.width = { ideal: window.innerWidth };
    else constraints.video.height = { ideal: window.innerHeight };

    return navigator.mediaDevices.getUserMedia(constraints).then(result => {
      if (videoRef.current != null) {
        videoRef.current.srcObject = result;
      }
      return result
    })
  }

  const getRecorder = (stream: MediaStream): MediaRecorder => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/mp4',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks(prevChunks => [...prevChunks, event.data]);
        console.log('Добавлен фрагмент:', event.data);
      }
    };

    return mediaRecorder;
  }

  const recordVideoHandler = async () => {
    if (fragmentNumber >= fragmentCount) {
      stopRecording();
      return
    }

    setTime(prevTime => prevTime + 1)

    if (faceOnCamera) {
      setFragmentNumber(prevDurationSec => prevDurationSec + 1)
      setFacePrompt(null);

      startRecording();

    } else {
      stopRecording();
      setFragmentNumber(0)
      setFacePrompt('Покажите лицо');
    }
  }

  const fillFacePrompt = (data: string | null) => {
    setFacePrompt(data)
  }

  const startLiveness = () => recordVideoHandler();

  const startRecording = () => {
    if (recorder && !isRecording) {
      setRecordedChunks([])
      setIsRecording(true)
      setFragmentNumber(0)

      mediaRecorderRef.current!.start();

      console.log('Начало записи:', new Date().toISOString());
    }
  }

  const stopRecording = () => {
    if (recorder && isRecording) {
      mediaRecorderRef.current!.stop();

      setIsRecording(false)

      console.log('Запись остановлена:', new Date().toISOString());
    }
  }

  return {
    initRecorder,
    isRecording,
    video,
    clearVideo,
    startLiveness,
    facePrompt,
    fillFacePrompt,
    videoRef,
    canvasRef
  }
}