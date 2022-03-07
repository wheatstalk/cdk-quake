import { QuakeServerDb, QuakeServerStatus } from './quake-server';
import { QuakeTasks } from './quake-tasks';

export interface QuakeServiceOptions {
  readonly quakeServerDb: QuakeServerDb;
  readonly quakeTasks: QuakeTasks;
}

export class QuakeService {
  private readonly quakeServerDb: QuakeServerDb;
  private readonly quakeTasks: QuakeTasks;

  constructor(options: QuakeServiceOptions) {
    this.quakeServerDb = options.quakeServerDb;
    this.quakeTasks = options.quakeTasks;
  }

  async putServer(request: { readonly name: string }) {
    if (await this.quakeServerDb.load(request.name)) {
      throw new Error('Already created');
    }

    const runQuakeTaskInfo = await this.quakeTasks.run(request.name);

    return this.quakeServerDb.store({
      name: request.name,
      status: QuakeServerStatus.STARTING,
      runQuakeTaskInfo: runQuakeTaskInfo,
    });
  }

  async getServer(name: string) {
    const quakeServer = await this.quakeServerDb.load(name);
    if (!quakeServer) {
      return;
    }

    const quakeTask = await this.quakeTasks.describe(quakeServer.runQuakeTaskInfo);
    const publicIp = quakeTask?.publicIp;
    // noinspection HttpUrlsUsage
    const url = publicIp ? `http://${publicIp}/` : undefined;

    if (quakeTask && quakeTask.status === quakeServer.status) {
      return {
        status: quakeServer.status,
        url,
      };
    }

    await this.quakeServerDb.store({
      ...quakeServer,
      status: <any>quakeTask?.status ?? QuakeServerStatus.STOPPED,
    });

    return {
      name,
      status: quakeServer.status,
      url,
    };
  }

  async deleteServer(name: string) {
    const quakeServer = await this.quakeServerDb.load(name);
    if (!quakeServer) {
      return;
    }

    await this.quakeTasks.stop(quakeServer.runQuakeTaskInfo);
    await this.quakeServerDb.delete(name);
  }
}
