require('dotenv').config();
var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

const puppeteer = require("puppeteer");
const uuid = require('uuid');
const fs = require('fs');
const archiver = require('archiver');

app.get('/', function (req, res) {
    res.send('Hello World!');
});

//Website to Image
app.get('/www2img', function (req, res) {
    const site = req.query.site;

    let width = 1920;
    let height = 1080;
    let full = true;

    let format = "webp";

    if(req.query.height !== undefined) {
        height = parseInt(req.query.height);
    }

    if(req.query.width !== undefined) {
        width = parseInt(req.query.width);
    }

    if(req.query.full !== undefined) {
        if(req.query.full == "false") {
            full = false;
        }
    }

    if(req.query.format !== undefined) {
        full = req.query.format;
    }

    let part = site.split(".");
    let prefix = part[0]+"_"+part[1];
    let folder = "public/data/"+prefix;
    if (!fs.existsSync(folder)){
        fs.mkdirSync(folder);
    }

    const uid = uuid.v4();

    const capture = async () => {
      const browser = await puppeteer.launch();
      const page = (await browser.pages())[0];

      let filename = part[0]+"_"+part[1]+'_'+uid+'.'+format;

      await page.goto("https://"+site, {
        waitUntil: 'networkidle0',
      });
      await page.setViewport({ width: width, height: height });
      await page.screenshot({ path: folder+'/'+filename, fullPage: full, "type": format,  });
      await browser.close();

      res.sendFile(__dirname + '/'+folder+'/'+filename);
    };

    capture();
    
});

//Website to Text
app.get('/www2txt', function(req, res) {
    const site = req.query.site;
    
    const extract = async () => {
        const browser = await puppeteer.launch({ headless: 'new'});
        const page = await (await browser.pages())[0];
        const uid = uuid.v4();

        let part = site.split(".");
        let prefix = part[0]+"_"+part[1];
        let folder = "public/data/"+prefix;
        if (!fs.existsSync(folder)){
            fs.mkdirSync(folder);
        }
        let filename = part[0]+"_"+part[1]+'_'+uid+'.txt';
  
        await page.goto("https://"+site, {
          waitUntil: 'networkidle0',
        });

        const extractedText = await page.$eval('*', (el) => el.innerText);


        fs.writeFile(folder+"/"+filename, extractedText, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
        }); 

        await browser.close();
        
        res.sendFile(__dirname + '/'+folder+'/'+filename);
      };
      extract();
});

//Website to Images as Zip
app.get('/www2imgs', function(req, res) {
    const site = req.query.site;

    let part = site.split(".");
    let prefix = part[0]+"_"+part[1];
    let folder = "public/data/"+prefix;
    if (!fs.existsSync(folder)){
        fs.mkdirSync(folder);
    }

    if (!fs.existsSync(folder+"/imgs")){
        fs.mkdirSync(folder+"/imgs");
    }

    var output = fs.createWriteStream(folder+'/imgs.zip');
    var archive = archiver('zip');

    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
    });
    
    archive.on('error', function(err){
        throw err;
    });

    const getImgs = async () => {
        const browser = await puppeteer.launch({ headless: 'new'});
        const page = await (await browser.pages())[0];
  
        let counter = 0;
        page.on('response', async (response) => {
            const matches = /.*\.(jpg|png|svg|gif|webp)$/.exec(response.url());
            console.log(matches);
            if (matches && (matches.length === 2)) {
                const extension = matches[1];
                const buffer = await response.buffer();
                fs.writeFileSync(folder+`/imgs/${counter}.${extension}`, buffer, 'base64');
                counter += 1;
            }
        });
      
        await page.goto("https://"+site);
        await browser.close();

        archive.pipe(output);
    
        // append files from a sub-directory, putting its contents at the root of archive
        archive.directory(folder+"/imgs", false);
        await archive.finalize();

        res.sendFile(__dirname + '/'+folder+'/imgs.zip');
      };
      getImgs();
      
});

app.listen(3000, function () {
    console.log('Core WWWWorker listens to :3000!');
});