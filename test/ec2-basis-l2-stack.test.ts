import * as cdk from 'aws-cdk-lib';
import {Template, Match} from 'aws-cdk-lib/assertions';
import {Ec2BasicL2Stack} from "../lib/ec2-basic-l2-stack";
import {Stack} from "aws-cdk-lib/core/lib/stack";

let app: cdk.App, stack: Stack, template: Template;

beforeAll(() => {
    app = new cdk.App();
    stack = new Ec2BasicL2Stack(app, 'Ec2BasicL2Stack', {
        env: {
            account: '123456789012',
            region: 'eu-west-3'
        }
    })
    template = Template.fromStack(stack)
    console.dir(template, {depth: null})
})

describe('Resource count tests', () => {
    it('should have one SecurityGroup', () => {
        template.resourceCountIs('AWS::EC2::SecurityGroup', 1)
    })
    it('shoud have one EC2 Instance', () => {
        template.resourceCountIs('AWS::EC2::Instance', 1)
    })
    it('should have one IAM role', () => {
        template.resourceCountIs('AWS::IAM::Role', 1)
    })
    it('should have one LaunchTemplate', () => {
        template.resourceCountIs('AWS::EC2::LaunchTemplate', 1)
    })
    it('should have one InstanceProfile', () => {
        template.resourceCountIs('AWS::IAM::InstanceProfile', 1)
    })
})

describe('SecurityGroup tests', () => {
    it('should have correct groupname', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {GroupName: 'ec2-basic-sg-l2'})
    });
    it('should have correct inbound and outbound rules', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            SecurityGroupEgress: [{
                CidrIp: '0.0.0.0/0',
                IpProtocol: '-1'
            }],
            SecurityGroupIngress: [{
                CidrIp: '0.0.0.0/0',
                IpProtocol: 'tcp',
                FromPort: 80,
                ToPort: 80
            }]
        })
    })
})

describe('IAM Role tests', () => {
    it('should have correct IAM Role for Ec2', () => {
        template.hasResourceProperties('AWS::IAM::Role', Match.objectLike({
            AssumeRolePolicyDocument: Match.objectLike({
                Statement: Match.arrayWith([{
                    Action: 'sts:AssumeRole',
                    Effect: 'Allow',
                    Principal: {Service: 'ec2.amazonaws.com'}
                }])
            }),
            Tags: Match.arrayWith([{
                Key: 'Name',
                Value: Match.stringLikeRegexp('basic-ec2')
            }])
        }))
    })
})

describe('Ec2LaunchTemplate tests', () => {
    it('should have correct LaunchTemplate', () => {
        template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
            LaunchTemplateData: {MetadataOptions: {HttpTokens: 'required'}},
            LaunchTemplateName: Match.stringLikeRegexp('basic-ec2-instance')
        })
    })
})


describe('Ec2Instance tests', () => {
    it('should have correct array of security groups', () => {
        template.hasResourceProperties('AWS::EC2::Instance', {SecurityGroupIds: [{'Fn::GetAtt': ['ec2basicsgl211C122C1', 'GroupId']}]});
    })
    it('should have correct instance type', () => {
        template.hasResourceProperties('AWS::EC2::Instance', {InstanceType: "t2.micro"})
    })
    it('should have latest Amazon Linux 2023 image', () => {
        template.hasResourceProperties('AWS::EC2::Instance', {ImageId: {Ref: Match.stringLikeRegexp('al2023')}})
    })
    it('should not have key PrivateDnsNameOptions', () => {
        template.hasResourceProperties('AWS::EC2::Instance', Match.not(Match.objectLike({
            PrivateDnsNameOptions: Match.anyValue()
        })));
    })
    it('should have a IamInstanceProfile', () => {
        template.hasResourceProperties('AWS::EC2::Instance', {
            IamInstanceProfile: {Ref: Match.stringLikeRegexp('basicec2instance')}
        })
    })
    it('should have correct LaunchTemplate', () => {
        template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
            LaunchTemplate: {
                LaunchTemplateName: Match.stringLikeRegexp('basic-ec2-instance')
            }
        }))
    })
    it('should depend on IAM Role', () => {
        template.hasResource('AWS::EC2::Instance', Match.objectLike({
            DependsOn: Match.arrayWith([Match.stringLikeRegexp('basicec2instance')])
        }))
    })
    it('should have user data containing \'Hello World from\'', () => {
        template.hasResourceProperties('AWS::EC2::Instance', {
            UserData: {'Fn::Base64': Match.stringLikeRegexp('Hello World from')}
        })
    })
})

describe("Ec2BasicL2Stack", () => {
    test("matches the snapshot", () => {
        expect(template.toJSON()).toMatchSnapshot()
    })
})
