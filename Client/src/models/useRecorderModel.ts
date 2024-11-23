import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState } from 'react';
import RecordRTC from 'recordrtc';

export default function () {
  const fragmentCount: number = 4;

  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [fragmentNumber, setFragmentNumber] = useState<number>(0)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [facePrompt, setFacePrompt] = useState<string | null>()
  
  const [recorder, setRecorder] = useState<RecordRTC>();
  const [time, setTime] = useState<number>(0);
  const [video, setVideo] = useState<Blob>();

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if(time == 0) return;

    const timer = setTimeout(recordVideoHandler, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [time])

  // Обработка при получении последнего фрагмента видео при остановке
  useEffect(() => {
    if(!isRecording && fragmentNumber >= fragmentCount) {
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

  const initRecorder = () => {
    try {
      faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      faceapi.nets.faceExpressionNet.loadFromUri('/models');

      getMediaStreamFromCamera().then((stream: MediaStream) => {
        console.log('Видео захват включен')
        const recorder = getRecorder(stream)
        setRecorder(recorder)
      });
      console.log('Модели загружены успешно');
    } catch (error) {
      console.error('Ошибка при загрузке моделей:', error);
    }
  }

  const isFaceOnCamera = async (): Promise<Boolean> => {
    const detections = await faceapi
      .detectAllFaces(
        videoRef.current!,
        new faceapi.TinyFaceDetectorOptions(),
      )
      .withFaceLandmarks()
      .withFaceExpressions();

    return detections.length > 0;
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
      mimeType: 'video/mp4',
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

    const faceOnCamera = await isFaceOnCamera();

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