import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {AmazonLinuxCpuType, AmazonLinuxGeneration, AmazonLinuxKernel, UserData} from 'aws-cdk-lib/aws-ec2';

export class Ec2BasicL2Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Get default Vpc from the AWS environment this stack is deployed to
        const defaultVpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {isDefault: true});

        // Create security group, necessary because the default sg created does not allow inbound traffic
        const mySecurityGroup = new ec2.SecurityGroup(this,'ec2-basic-sg-l2', {
            vpc: defaultVpc,
            securityGroupName: 'ec2-basic-sg-l2',
            allowAllOutbound: true
        });
        mySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow inbound http from anywhere');

        // Create ec2 t2 micro instance using L2 construct
        new ec2.Instance(this, 'basic-ec2-instance', {
            instanceName: 'cdk-basic-ec2-instance',
            keyPair: undefined,
            vpc: defaultVpc,
            machineImage: new ec2.AmazonLinuxImage({
                cpuType: AmazonLinuxCpuType.X86_64,
                generation: AmazonLinuxGeneration.AMAZON_LINUX_2023,
                kernel: AmazonLinuxKernel.KERNEL6_1,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            securityGroup: mySecurityGroup,
            requireImdsv2: true,
            ssmSessionPermissions: false,
            userData: UserData.custom('#!/bin/bash\n' +
                '# Use this for your user data (script from top to bottom)\n' +
                '# install httpd (Linux 2 version)\n' +
                'yum update -y\n' +
                'yum install -y httpd\n' +
                'systemctl start httpd\n' +
                'systemctl enable httpd\n' +
                'echo "<h1>Hello World from $(hostname -f)</h1>" > /var/www/html/index.html')
        });
    }
}
