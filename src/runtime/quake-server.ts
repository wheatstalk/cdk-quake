import AWS from 'aws-sdk';
import { ENV_QUAKE_TABLE } from '../constants';
import { RunQuakeTaskInfo } from './quake-tasks';

export interface QuakeServer {
  readonly name: string;
  readonly status: QuakeServerStatus;
  readonly runQuakeTaskInfo: RunQuakeTaskInfo;
}

export enum QuakeServerStatus {
  RUNNING = 'RUNNING',
  STARTING = 'STARTING',
  STOPPED = 'STOPPED'
}

export class QuakeServerDb {
  private readonly sdk: AWS.DynamoDB.DocumentClient;
  private readonly tableName: string;

  constructor() {
    this.sdk = new AWS.DynamoDB.DocumentClient();
    this.tableName = process.env[ENV_QUAKE_TABLE] as string;
  }

  async store(quakeServer: QuakeServer) {
    const name = quakeServer.name;

    await this.sdk.put({
      TableName: this.tableName,
      Item: {
        ...getKey(name),
        QuakeServer: quakeServer,
      },
    }).promise();

    return quakeServer;
  }

  async load(name: string): Promise<QuakeServer | undefined> {
    const result = await this.sdk.get({
      TableName: this.tableName,
      Key: getKey(name),
    }).promise();

    return result.Item && this.decodeItem(result.Item);
  }

  async delete(name: string) {
    await this.sdk.delete({
      TableName: this.tableName,
      Key: getKey(name),
    }).promise();
  }

  decodeItem(item: any) {
    return item.QuakeServer;
  }
}

function getKeyValue(name: string) {
  return `QuakeServer#${name}`;
}

function getKey(name: string) {
  const keyValue = getKeyValue(name);
  return {
    PK: keyValue,
    SK: keyValue,
  };
}
