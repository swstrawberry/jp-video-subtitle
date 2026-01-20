import express from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import OpenAI from 'openai';

const app = express();
const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.static('public'));

app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const videoPath = req.file.path;
    const audioPath = `${videoPath}.wav`;

    // 1️⃣ 영상에서 음성 추출
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('pcm_s16le')
        .format('wav')
        .save(audioPath)
        .on('end', resolve)
        .on('error', reject);
    });

    // 2️⃣ 일본어 → 한국어 자막(SRT)
    const result = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'gpt-4o-transcribe',
      response_format: 'srt',
      translate: true
    });

    // 3️⃣ 자막 파일 저장
    const srtPath = `${videoPath}.ko.srt`;
    fs.writeFileSync(srtPath, result);

    // 4️⃣ 자막 다운로드
    res.download(srtPath, 'subtitle_ko.srt');
  } catch (err) {
    console.error(err);
    res.status(500).send('자막 생성 중 오류 발생');
  }
});

app.listen(3000, () => {
  console.log('서버 실행 중');
});
