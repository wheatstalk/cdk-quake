import * as aws_ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export class QuakeTaskDefinition extends aws_ecs.FargateTaskDefinition {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    const quakeContainer = this.addContainer('quake', {
      image: aws_ecs.ContainerImage.fromRegistry('wheatstalk/quakejs-docker'),
      environment: {
        HTTP_PORT: '80',
      },
      logging: new aws_ecs.AwsLogDriver({ streamPrefix: 'task' }),
    });

    quakeContainer.addUlimits({
      name: aws_ecs.UlimitName.NOFILE,
      softLimit: 8192,
      hardLimit: 8192,
    });
  }
}
