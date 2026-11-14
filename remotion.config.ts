import {Config} from '@remotion/cli/config';

// 4K60 的成片：帧图用 jpeg 省 IO，编码 crf 低一点保住贴纸的纯色块
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(17);
Config.setPixelFormat('yuv420p');
Config.setConcurrency(6);
Config.setChromiumOpenGlRenderer('angle');
// 本机已装 Chrome，跳过头像 shell 下载（那玩意在国内基本下不动）
Config.setBrowserExecutable('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
