import * as cdk from 'aws-cdk-lib';
import {Ec2BasicL1Stack} from "../lib/provisioned/ec2-basic-l1-stack";
import {Ec2BasicL2Stack} from "../lib/provisioned/ec2-basic-l2-stack";

const props = {
    env: {
        account: '123456789012',
        region: 'eu-west-1'
    }
}

test('Stack Ec2BasicL1Stack created', () => {
    const app = new cdk.App();
    const stack1 = new Ec2BasicL1Stack(app, 'Ec2BasicL1TestStack', props );
    const stack2 = new Ec2BasicL2Stack(app, 'Ec2BasicL2TestStack', props );

    expect(stack1).toBeInstanceOf(Ec2BasicL1Stack);
    expect(stack1.artifactId).toEqual('Ec2BasicL1TestStack');

    expect(stack2).toBeInstanceOf(Ec2BasicL2Stack);
    expect(stack2.artifactId).toEqual('Ec2BasicL2TestStack');
});
