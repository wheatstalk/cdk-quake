import 'source-map-support/register';
import serverlessExpress from '@vendia/serverless-express';
import bodyParser from 'body-parser';
import express from 'express';
import morgan from 'morgan';
import { QuakeServerDb } from './quake-server';
import { QuakeService } from './quake-service';
import { QuakeTasks } from './quake-tasks';

const service = new QuakeService({
  quakeServerDb: new QuakeServerDb(),
  quakeTasks: new QuakeTasks(),
});

const app = express();
app.use(morgan('common'));
app.use(bodyParser.json());

app.put('/quake/:name', async (req, res) => {
  const quakeServer = await service.putServer({
    name: req.params.name,
  });

  res.json(quakeServer);
});

app.get('/quake/:name', async (req, res) => {
  const quakeServer = await service.getServer(req.params.name);

  if (quakeServer) {
    res.json(quakeServer);
  } else {
    res.status(404);
    res.send('Quake server not found');
  }
});

app.delete('/quake/:name', async (req, res) => {
  await service.deleteServer(req.params.name);
  res.json({
    deleted: true,
  });
});

export const handler = <any>serverlessExpress({
  app,
});
