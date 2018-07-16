// tslint:disable:no-console
import boxen from "boxen";
import chalk from "chalk";

export function outputDebug(str: string) {
    console.log("  " + chalk.gray(str));
}

export function outputCurrentState(str: string) {
    console.log(boxen(str, { padding: 1, float: "center" }));
}

export function outputDoom(str: string) {
    console.log(boxen(str, { padding: 0, borderColor: "red", borderStyle: "double", float: "center" }));
}

export function output(msg: string) {
    console.log(msg);
}