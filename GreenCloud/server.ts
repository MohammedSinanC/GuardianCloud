import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import bootstrap from './src/main.server';

const app = express();
const angularBrowser = join(process.cwd(), 'dist/hygiene-website/browser');
const angularServer = join(process.cwd(), 'dist/hygiene-website/server');

app.use(express.static(angularBrowser, {
  maxAge: '1y',
}));

const commonEngine = new CommonEngine();

app.get('*', (req, res, next) => {
  const { protocol, originalUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: join(angularServer, 'index.server.html'),
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: angularBrowser,
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  console.log(`Angular SSR server listening on http://localhost:${port}`);
});
