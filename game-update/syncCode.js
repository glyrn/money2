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

    const destFolder = './upload';

    if(req.file.filename == "001.zip"){
        // destFolder = 001的前端路径
    }else if(req.file.filename == "002.zip"){
        // destFolder = 002的前端路径
    }else if(req.file.filename == "003.zip"){
        // destFolder = 003的前端路径
    }else if(req.file.filename == "005.zip"){
        // destFolder = 005的前端路径
    }else if(req.file.filename == "006.zip"){
        // destFolder = 006的前端路径
    }else if(req.file.filename == "008.zip"){
        // destFolder = 008的前端路径
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