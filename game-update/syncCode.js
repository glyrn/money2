const express = require('express');
const multer = require('multer');
const app = express();
const admZip = require('adm-zip');
const fs = require('fs');

// 配置 multer 的存储路径和文件名
const storage = multer.diskStorage({
destination: function (req, file, cb) {
    cb(null, 'upload/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// 创建文件上传的路由
app.post('/syncgame', upload.single('file'), (req, res) => {

    res.send(req.file.filename+' 文件上传成功');
    const zipFile = './upload/'+req.file.filename;

        //五子棋上传路径
        const destFolder_001 = '/sunday/lianjin_game/game-update/game-wzq';
        //斗地主上传路径
        const destFolder_002 = '/sunday/lianjin_game/game-update/game-hlddz';
        // UNO上传路径
        const destFolder_003 = '/sunday/lianjin_game/game-update/game-uno';
        // 中国象棋上传路径
        const destFolder_005 = '/sunday/lianjin_game/game-update/game-zgxq';
        // 飞行棋上传路径
        const destFolder_006 = '/sunday/lianjin_game/game-update/game-fxq';
        // 大富翁上传路径
        const destFolder_007 = './games/monopoly';
        // 跳动小鸟上传路径
        const destFolder_008 = '/sunday/lianjin_game/game-update/game-voicejump';

    const destFolder = './upload';

    if(req.file.filename == "001.zip"){
        destFolder = destFolder_001;
    }else if(req.file.filename == "002.zip"){
        destFolder = destFolder_002;
    }else if(req.file.filename == "003.zip"){
        destFolder = destFolder_003;
    }else if(req.file.filename == "005.zip"){
        destFolder = destFolder_005;
    }else if(req.file.filename == "006.zip"){
        destFolder = destFolder_006;
    }else if(req.file.filename == "007.zip"){
        destFolder = destFolder_007;
    }else if(req.file.filename == "008.zip"){
        destFolder = destFolder_008;
    }
    
    const zip = new admZip(zipFile);
    zip.extractAllTo(destFolder, true);
    console.log("解压完成："+destFolder);

    fs.unlink(zipFile, (err) => {
        if (err) {
            console.error('删除文件出错', err);
        } else {
            console.log(zipFile+' 文件删除成功');
        }
    });
});

app.listen(3000, () => {
console.log('文件上传服务运行在 http://localhost:3000');
});