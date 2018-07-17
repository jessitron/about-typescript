import chalk from "chalk";
import * as inquirer from "inquirer";
import inquirerAutocomplete from "inquirer-autocomplete-prompt";
import * as _ from "lodash";
import { DependencyMap } from "package-json";
import { Room } from "../support/buildRoom";
import { greyish } from "./output";

inquirer.registerPrompt("autocomplete", inquirerAutocomplete);

export type NextAction = "exit" | "doors" | "back" | "teleport" | "gps" | "look";

export type NextActionAnswers =
    { action: "exit" | "back" | "gps" | "look" } |
    {
        action: "doors", door: string,
    } |
    {
        action: "teleport",
        destination: string,
    };

interface ChoiceInRoom extends inquirer.objects.ChoiceOption {
    value: NextAction;
    name: string; // not optional
    key: string; // not optional
}

const ExitChoice: ChoiceInRoom = {
    name: "Leave",
    value: "exit",
    key: "e",
};

const LookForDoorsChoice: ChoiceInRoom = {
    name: `Look for ${chalk.bold("d")}oors`,
    value: "doors",
    key: "d",
};

const TeleportChoice: ChoiceInRoom = {
    name: "Teleport",
    value: "teleport",
    key: "t",
};

const LookAround: ChoiceInRoom = {
    name: "Look around",
    value: "look",
    key: "l",
};

const CheckGPS: ChoiceInRoom = {
    name: "Check GPS",
    value: "gps",
    key: "g",
};

function actionChoices(past: Room[]): ChoiceInRoom[] {
    if (past.length > 0) {
        const goBack: ChoiceInRoom = {
            name: "Go back to " + past[0].packageJson.name,
            value: "back",
            key: "b",
        };
        return [LookForDoorsChoice, LookAround, CheckGPS, goBack, TeleportChoice, ExitChoice];
    } else {
        return [LookForDoorsChoice, LookAround, CheckGPS, TeleportChoice, ExitChoice];
    }
}

export async function requestNextAction(p: Room, past: Room[]): Promise<NextActionAnswers> {
    const question: inquirer.Question<NextActionAnswers> /* note 1: type parameters */ = {
        name: "action",
        type: "autocomplete", /* note 2: keywords as property names */
        message: "What would you like to do?",
        source: autocompleteByNameOrKey(actionChoices(past)),
    } as any; /* note 3: why any? where do these types come from? */
    const response = await inquirer.prompt<NextActionAnswers>([question, chooseDoor(p), chooseTeleport()]);
    return response;
}

function autocompleteByNameOrKey(choices: ChoiceInRoom[]):
    (answers: any, input: string) => Promise<inquirer.objects.ChoiceOption[]> {
    return async (answersSoFar: Partial<NextActionAnswers>, input: string) =>
        choices
            .filter((c) =>
                input == null ||
                c.key === input ||
                c.name.toLowerCase().startsWith(input.toLowerCase()))
            .map(boldKey);
}

function choicesFromDependencyObject(optionalDeps: DependencyMap | undefined,
    colorFn: (txt: string) => string): inquirer.objects.ChoiceOption[] {
    const deps = optionalDeps || {};
    return Object.keys(deps).map((d) => ({
        value: d,
        name: colorFn(d + ":" + deps[d]),
    }));
}

function chooseDoor(p: Room): inquirer.Question<NextActionAnswers> {
    const allDependencies = choicesFromDependencyObject(p.packageJson.dependencies, chalk.white)
        .concat(choicesFromDependencyObject(p.packageJson.devDependencies, greyish))
        .concat(choicesFromDependencyObject(p.packageJson.peerDependencies, chalk.magenta));
    const listOfDependencies = _.sortBy(
        allDependencies,
        (ct) => ct.value as string);
    const choices = listOfDependencies.length === 0 ?
        [{ name: "Go toward it", value: "VICTORY" }] :
        listOfDependencies.concat([new inquirer.Separator()]);
    const message = listOfDependencies.length === 0 ?
        `You see light ahead...` :
        `There are ${listOfDependencies.length} doors. Choose one to enter: `;
    return {
        name: "door",
        type: "autocomplete",
        message,
        source: anywhereInName(choices),
        when: (a: Partial<NextActionAnswers>) => a.action === "doors",
    } as any;
}

function anywhereInName(choices: inquirer.objects.ChoiceOption[]):
    (answers: any, input: string) => Promise<inquirer.objects.ChoiceOption[]> {
    return async (answersSoFar: Partial<NextActionAnswers>, input: string) =>
        choices
            .filter((c) =>
                input == null ||
                (c.name || "").toLowerCase().includes(input.toLowerCase()));
}

function chooseTeleport(): inquirer.Question<NextActionAnswers> {
    return {
        name: "destination",
        type: "input",
        message: `Enter a library to teleport to: `,
        when: (a) => a.action === "teleport",
    };
}

function boldFirstOccurrence(str: string, letter: string): string {
    const i = str.toLowerCase().indexOf(letter.toLowerCase());
    if (i < 0) {
        return str;
    }
    return str.slice(0, i) + chalk.bold(str[i]) + str.slice(i + 1);
}

function boldKey(c: ChoiceInRoom): ChoiceInRoom {
    return {
        ...c,
        name: boldFirstOccurrence(c.name, c.key),
    };
}
