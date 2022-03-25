#!/usr/bin/env node

import chalk from 'chalk';
import { exec } from 'child_process';
import download from 'download-git-repo';
import fs from 'fs';
import inquirer from 'inquirer';
import fetch from 'node-fetch';
import ora from 'ora';
import Stump from 'stump.js';

const stump = new Stump(['Debug', 'Timestamp']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('');

inquirer
    .prompt([
        {
            type: 'confirm',
            message: 'Create a new Conflict project in ' + chalk.yellowBright(process.cwd()),
            name: 'continue',
            default: false
        },
    ])
    .then(async answers => {
        if (!answers.continue) {
            stump.info('Cancelled process');
            console.log('');
            return process.exit(1);
        }
        stump.info('Starting create-conflict-app@1.1.1');
        const startTime = Date.now();
        const release = ora('Fetching latest release').start();
        let tag;
        try {
            const response = await fetch('https://api.github.com/repos/conflictjs/conflict-starter/releases/latest');
            const releaseData = await response.json();
            tag = releaseData.tag_name;
        } catch (err) {
            release.fail('Failed to fetch latest release');
            console.log('');
            return process.exit(1);
        }
        release.succeed('Fetched latest release (' + tag + ')');
        const downloadSpinner = ora('Downloading files').start();
        download('conflictjs/conflict-starter#' + tag, process.cwd(), async function (err) {
            if (err) {
                return downloadSpinner.fail('Unable to download files');
            }
            downloadSpinner.succeed('Downloaded files');
            if (fs.existsSync(process.cwd() + '/.installrc')) {
                let lines = fs.readFileSync(process.cwd() + '/.installrc').toString().split('\n');
                for (let line of lines) {
                    if (line.startsWith('#(')) {
                        let condition = line.substring(2, line.indexOf(')|'));
                        if (condition === 'platform=win32' && process.platform == 'win32') line = line.substring(line.indexOf(')|') + 2);
                        else if (condition === 'platform!=win32' && process.platform !== 'win32') line = line.substring(line.indexOf(')|') + 2);
                        else return;
                    }
                    if (line.startsWith('#')) return;
                    try {
                        await (() => {
                            return new Promise((resolve) => {
                                const spinner = ora('Run command ' + chalk.yellowBright(line)).start();
                                exec(line, { cwd: process.cwd() }, (err, stdout, stderr) => {
                                    if (err) {
                                        spinner.fail('Error running command ' + chalk.yellowBright(line));
                                        stump.error(err);
                                        console.log('');
                                        return process.exit(1);
                                    }
                                    spinner.succeed('Command ' + chalk.yellowBright(line) + ' ran successfully\n');
                                    resolve();
                                });
                            });
                        })();
                    } catch (err) {}
                }
            }
            stump.success('Completed in ' + (Date.now() - startTime) + 'ms');
            console.log('');
            process.exit(0);
        });
    });