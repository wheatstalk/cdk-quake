import * as cdk from 'aws-cdk-lib';
import { QuakeData, QuakeInfrastructure, QuakeApi } from '../src/constructs';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'integ-quake-main');

const quakeInfrastructure = new QuakeInfrastructure(stack, 'QuakeInfrastructure');
const quakeData = new QuakeData(stack, 'QuakeData');

new QuakeApi(stack, 'QuakeApi', {
  quakeInfrastructure,
  quakeData,
});