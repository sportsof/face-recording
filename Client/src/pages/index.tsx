import ILivenessResponse from '@/typings';
import { useModel } from '@umijs/max';
import { Button, message, Modal, Result, Space } from 'antd';
import axios from 'axios';
import React, { useEffect, useRef } from 'react';

export default () => {
  const loadUrl = '/api/FaceRecording/CheckVideo';

  const {
    initRecorder,
    startLiveness,
    isRecording,
    video,
    clearVideo,
    facePrompt,
    fillFacePrompt,
    videoRef
  } = useModel('useRecorderModel')

  const [isModalOpen, setIsmodalOpen] = React.useState(false)
  const [buttonDisabled, setButtonDisabled] = React.useState(false);
  const [liveness, setLiveness] = React.useState<ILivenessResponse>();

  const recordAndSave = async () => {
    setButtonDisabled(true);
    startLiveness();
  }

  useEffect(() => initRecorder(), []);

  useEffect(() => {
    if (video) {
      fillFacePrompt('Пожалуйста, подождите...')
      
      const formData = new FormData();
      formData.append('video', video, 'recorded_video.mp4');

      axios.post(loadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }).then((response) => {
        setLiveness(response.data);
      }).catch((error) => {
        console.error('Ошибка при загрузке видео на сервер:', error);
      }).finally(() => {
        clearVideo()
        setButtonDisabled(false);
        fillFacePrompt(null);
        setIsmodalOpen(true)
      })
    }
  }, [video])

  return (
    <div className='liveness-wrapper'>
      <Space size="large" align="center" direction="vertical">
        <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            style={{ width: '100%', height: 'auto' }}
          />
          {isRecording && (
            <div className='record-icon' />
          )}
          {facePrompt && (
            <div className='face-promt'>{facePrompt}</div>
          )}
        </div>
        <Button
          size="large"
          type="primary"
          onClick={recordAndSave}
          disabled={buttonDisabled}
        >
          Начать запись
        </Button>
      </Space>
      <Modal
        title={null}
        open={isModalOpen}
        onCancel={() => setIsmodalOpen(false)}
        footer={null}
      >
        {liveness && <>
          <Result
            status={liveness.alive ? "success" : "error"}
            title={liveness.alive ? "Проверка пройдена" : "Проверка не пройдена"}
            extra={[
              liveness.alive 
              ? <img key="photo" src={`data:image/png;base64,${liveness.photo}`} style={{ width: '100%' }} />
              : <p key="message">{liveness.message}</p>
            ]}
          />
        </>}
      </Modal>
    </div>
  )
}