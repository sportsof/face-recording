import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState } from 'react';

//const detectorOptions = new faceapi.TinyFaceDetectorOptions()
const detectorOptions = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.4,
  maxResults: 1,
});

export default function () {
  const fragmentCount: number = 4;

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [fragmentNumber, setFragmentNumber] = useState<number>(0);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [facePrompt, setFacePrompt] = useState<string | null>();
  const [showOval, setShowOval] = useState(false);

  const [recorder, setRecorder] = useState<MediaRecorder>();
  const [time, setTime] = useState<number>(0);
  const [video, setVideo] = useState<Blob>();

  const [faceOnCamera, setFaceOnCamera] = useState<boolean>(false);
  const [faceTime, setFaceTime] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (time == 0) return;

    const timer = setTimeout(recordVideoHandler, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [time]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setFaceTime((prevTime) => prevTime + 1);
      const result = await isFaceOnCamera();
      console.log('face', result);
      setFaceOnCamera(result);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [faceTime]);

  useEffect(() => {
    if (!isRecording && fragmentNumber >= fragmentCount) {
      const recordedBlob = new Blob(recordedChunks, {
        type: 'video/mp4',
      });

      setVideo(recordedBlob);
      setFragmentNumber(0);
    }
  }, [isRecording, recordedChunks]);

  const clearVideo = () => {
    setVideo(undefined);
  };

  const initRecorder = async () => {
    try {
      //await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models');

      getMediaStreamFromCamera().then(async (stream: MediaStream) => {
        console.log('Видео захват включен');

        const recorder = getRecorder(stream);
        mediaRecorderRef.current = recorder;
        setRecorder(recorder);
        setFaceTime((prevTime) => prevTime + 1);
      });
      console.log('Модели загружены успешно');
    } catch (error) {
      console.error('Ошибка при загрузке моделей:', error);
    }
  };

  const isFaceOnCamera = async (): Promise<boolean> => {
    const face = await faceapi.detectSingleFace(
      videoRef.current!,
      detectorOptions,
    );
    //.withFaceLandmarks()
    //.withFaceExpressions()

    return face !== undefined;
  };

  const getMediaStreamFromCamera = async (): Promise<MediaStream> => {
    const constraints: any = {
      audio: false,
      video: { facingMode: 'user', resizeMode: 'crop-and-scale' },
    };

    if (window.innerWidth > window.innerHeight)
      constraints.video.width = { ideal: window.innerWidth };
    else constraints.video.height = { ideal: window.innerHeight };

    return navigator.mediaDevices.getUserMedia(constraints).then((result) => {
      if (videoRef.current != null) {
        videoRef.current.srcObject = result;
      }
      return result;
    });
  };

  const getRecorder = (stream: MediaStream): MediaRecorder => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/mp4',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prevChunks) => [...prevChunks, event.data]);
        console.log('Добавлен фрагмент:', event.data);
      }
    };

    return mediaRecorder;
  };

  const recordVideoHandler = async () => {
    if (fragmentNumber >= fragmentCount) {
      stopRecording();
      return;
    }

    setTime((prevTime) => prevTime + 1);

    if (faceOnCamera) {
      setFragmentNumber((prevDurationSec) => prevDurationSec + 1);
      setFacePrompt(null);
      setShowOval(true); 
      startRecording();
    } else {
      stopRecording();
      setFragmentNumber(0);
      setShowOval(true); 
      setFacePrompt('Покажите лицо');
    }
  };

  const fillFacePrompt = (data: string | null) => {
    setFacePrompt(data);
  };

  const startLiveness = () => recordVideoHandler();

  const startRecording = () => {
    if (recorder && !isRecording) {
      setRecordedChunks([]);
      setIsRecording(true);
      setFragmentNumber(0);
      setShowOval(true); 

      mediaRecorderRef.current!.start();

      console.log('Начало записи:', new Date().toISOString());
    }
  };

  const stopRecording = () => {
    if (recorder && isRecording) {
      mediaRecorderRef.current!.stop();

      setIsRecording(false);

      console.log('Запись остановлена:', new Date().toISOString());
    }
  };

  const drawProgressOval = () => {
    if (!showOval) return;
    const displaySize = { width: videoRef.current!.videoWidth, height: videoRef.current!.videoHeight };
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
  
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 4;
    const radiusX = radius * 1.2 + radius * 0.3;
    const radiusY = radius + radius * 0.3;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    const segments = 4;
    const totalDegrees = 360;
    const gapDegrees = 10;
    const segmentDegrees = (totalDegrees - (segments * gapDegrees)) / segments;
  
    const gapAngle = (gapDegrees * Math.PI) / 180;
    const anglePerSegment = (segmentDegrees * Math.PI) / 180;
  
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 2); 
  
    for (let i = 0; i < segments; i++) {
      const startAngle = i * (anglePerSegment + gapAngle);
      const endAngle = startAngle + anglePerSegment;
  
      if (i < fragmentNumber) {
        ctx.strokeStyle = 'green';
      } else {
        ctx.strokeStyle = 'white';
      }
  
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
  
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, startAngle, endAngle);
      ctx.stroke();
    }
  
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawProgressOval();
  }, [isRecording, fragmentNumber, fragmentCount, showOval]);

  return {
    initRecorder,
    isRecording,
    video,
    clearVideo,
    startLiveness,
    facePrompt,
    fillFacePrompt,
    videoRef,
    canvasRef,
    setShowOval,
    showOval
  };
}
