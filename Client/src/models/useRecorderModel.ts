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
  
  const [recorder, setRecorder] = useState<RecordRTC>();
  const [time, setTime] = useState<number>(0);
  const [video, setVideo] = useState<Blob>();

  const [faceOnCamera, setFaceOnCamera] = useState<boolean>(false)
  const [faceTime, setFaceTime] = useState<number>(0)

  const videoRef = useRef<HTMLVideoElement>(null);


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
    
    return face !== undefined
  }

  const getMediaStreamFromCamera = async (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({ video: true }).then(result => {
      if (videoRef.current != null) {
        videoRef.current.srcObject = result;
      }
      return result
    })
  }

  const getRecorder = (stream: MediaStream): RecordRTC => {
    const recorder = new RecordRTC(stream, {
      type: 'video',
      recorderType: MediaStreamRecorder,
      mimeType: 'video/mp4',
      disableLogs: true,
      timeSlice: 1000,
      ondataavailable: (blob: Blob) => {
        if (blob && blob.size > 0) {
          setRecordedChunks(prevChunks => [...prevChunks, blob])
          console.log('Добавлен фрагмент:', blob);
        } else {
          console.warn('Событие ondataavailable не содержит данных');
        }
      },
    })
    return recorder
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

      recorder.reset();
      recorder.startRecording();

      console.log('Начало записи:', new Date().toISOString());
    }
  }

  const stopRecording = () => {
    if (recorder && isRecording) {
      recorder.stopRecording();

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
    videoRef
  }
}