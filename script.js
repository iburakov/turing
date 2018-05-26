const STEP_INTERVAL_MS = 50;

const MOVES = ['C', 'R', 'L'];
const STATES = ['q1', 'q2', 'q3', 'q4'];
const FULL_STATES = ['q0'].concat(STATES);
const SYMBOLS = ['S', '0', '1', '2'];
const INITIAL_STATE = 'q1';

const DEFAULT_LIMIT = 1000;
const MAX_EXECUTION_LIMIT = 1e6;

const EMPTY_RULE_SAVE_PLACEHOLDER = 'NNNN';


let lastLimit = DEFAULT_LIMIT;
let limitChangedByUser = false;


function Rule(str) {
    if (str.length === 0 ){
        this.isEmpty = true;
        return;
    }

    if (str.length !== 4) {
        console.error("Bad string was given to rule constructor: " + str);
    } else {
        this.nextState = str.substring(0, 2);
        this.newSymbol = str[2];
        this.move = str[3];
        this.isEmpty = false;
    }
}

Rule.prototype.isValid = function() {
    return this.isEmpty ||
        MOVES.indexOf(this.move) !== -1 &&
        FULL_STATES.indexOf(this.nextState) !== -1 &&
        SYMBOLS.indexOf(this.newSymbol) !== -1;
};

Rule.prototype.toString = function () {
    if (this.isEmpty) return "";
    if (this.isValid()) {
        return this.nextState + this.newSymbol + this.move;
    } else return "[INVALID RULE]";
};


function Tape(str) {
    this.symbols = str;
    if (this.isStrValid()){
        this.isValid = true;
        this.position = this.symbols.indexOf('[');
        this.symbols = this.symbols.replace("[", "").replace("]", "");
    } else {
        this.isValid = false;
    }
}

Tape.prototype.getCurrentSymbol = function() {
    return this.symbols[this.position];
};

Tape.prototype.toHtml = function() {
    return '<span class="li-tape">...SSS' + this.symbols.slice(null, this.position) +
        '<span class="li-head">[' + this.getCurrentSymbol() + ']</span>' +
        this.symbols.slice(this.position + 1) + 'SSS...</span>';
};

Tape.prototype.doMove = function (move){
    switch (move){
        case 'L':
            if (this.position === 0) {
                this.symbols = "S" + this.symbols;
            } else this.position--;
            break;
        case 'C':
            break;
        case 'R':
            if (this.position++ === this.symbols.length - 1) {
                this.symbols += "S";
            }
            break;
        default:
            console.error("Bad move: " + move);
    }
};

Tape.prototype.isStrValid = function() {
    return this.symbols.length >= 3 &&
        this.symbols.split('').every(function(symbol){ return ['[', ']'].concat(SYMBOLS).indexOf(symbol) !== -1; }) &&
        (this.symbols.split('[').length - 1) === 1 &&
        (this.symbols.split(']').length - 1) === 1 &&
        this.symbols.indexOf(']') - this.symbols.indexOf('[') === 2;
};

function lockInput() {
    $("input").prop('disabled', true);
}

function unlockInput() {
    $("input").prop('disabled', false);
}

function Turing() {
    this.tape = null;
    this.clearRules();
    this.isRunning = false;
    this.state = INITIAL_STATE;
    this.inputMatrix = new InputMatrix("#inputmatrix");
}

Turing.prototype.clearRules = function() {
    function makeRow() {
        return {'S': null, '0': null, '1': null, '2': null};
    }
    this.rules = {'q1': makeRow(), 'q2': makeRow(), 'q3': makeRow(), 'q4': makeRow()};
};

Turing.prototype.reset = function ()  {
    $(".invalid").removeClass("invalid");
    $("#log").html("");
    unlockInput();

    this.tape = null;
    this.clearRules();

    this.isRunning = false;
    this.state = INITIAL_STATE;
};

Turing.prototype.startRunning = function () {
    this.reset();

    let inputtape = $("#inputtape");
    inputtape.val(inputtape.val().toUpperCase())
    this.tape = new Tape(inputtape.val());
    if (this.tape.isValid) {
        let areRulesOK = true;

        // iterating over inputs of rules
        for (let state of STATES) {
            for (let symbol of SYMBOLS) {
                let rule = this.inputMatrix.getRule(state, symbol);
                if (rule.isValid()) {
                    this.rules[state][symbol] = rule;
                } else {
                    areRulesOK = false;
                    this.inputMatrix.getInputNode(state, symbol).classList.add("invalid");
                }
            }
        }

        if (areRulesOK){
            if (!limitChangedByUser || $("#execute_limiter_inp").val() > 0){
                this.isRunning = true;
                if (!limitChangedByUser) $("#execute_limiter_inp").val(lastLimit);
                lockInput();
                appendToLog(`
                    <li>
                      Initial: ` + this.tape.toHtml() + `
                    </li>
                `);
                return true;
            } else $("#execute_limiter_inp").addClass("invalid");
        }
    } else $("#inputtape").addClass("invalid");
    return false;
};

Turing.prototype.run = function() {
    if (this.isRunning || !this.isRunning && this.startRunning()) {
        if (!this.stepperIntervalId) {
            this.stepperIntervalId = window.setInterval(function(){
                turing.step();
            }, STEP_INTERVAL_MS);
            console.log("Starting stepper with intervalId " + this.stepperIntervalId);
        }
    }
};

Turing.prototype.stopStepper = function () {
    if (this.isRunning){
        clearInterval(this.stepperIntervalId);
        this.stepperIntervalId = null;
        console.log("Stopping stepper...");
    }
};

Turing.prototype.stop = function () {
    if (this.isRunning){
        this.stopStepper()
        this.isRunning = false;
        limitChangedByUser = false;
        unlockInput();
        console.log("Stopping machine...");
    }
};

Turing.prototype.step = function() {
    if (this.isRunning || !this.isRunning && this.startRunning()) {
        if (this.state === FULL_STATES[0]) {
            appendToLog("<li><span class='invalid'>Машина перешла в терминальное состояние!</span></li>");
            this.stop();
            return;
        }

        let limitInp = $("#execute_limiter_inp");
        let limitVal = limitInp.val();
        limitInp.val(--limitVal);

        if (limitVal === 0) {
            appendToLog("<li><span class='invalid'>Закончился лимит шагов выполнения!</span></li>");
            this.stop();
            return;
        }

        const old = {state: this.state, symbol: this.tape.getCurrentSymbol()};

        // processing step
        let ruleToExecute = this.rules[this.state][this.tape.getCurrentSymbol()];
        if (ruleToExecute.isEmpty) {
            appendToLog(`
                <li>
                  <span class="li-state">(` + old.state + `,` + old.symbol + `)</span>
                  :
                  <span class="invalid">Необходимая команда не была обнаружена</span>
                </li>
            `);
            this.inputMatrix.getInputNode(old.state, old.symbol).classList.add("invalid");
            this.stop();
            return;
        }

        let symarr = this.tape.symbols.split('');
        symarr[this.tape.position] = ruleToExecute.newSymbol;
        this.tape.symbols = symarr.join('');
        this.tape.doMove(ruleToExecute.move);
        this.state = ruleToExecute.nextState;

        // logging
        appendToLog(`
            <li>
              <span class="li-state">(` + old.state + `,` + old.symbol + `)</span>
              :
              <span class="li-rule">` + ruleToExecute + `</span>
              -->
              ` + this.tape.toHtml() + `
            </li>
        `);
    }
};

function appendToLog(appendedHtml) {
    $("#log").html($("#log").html() + appendedHtml);
}

function InputMatrix(targetObjSelector) {
    this.selector = targetObjSelector;
}

InputMatrix.prototype.getObject = function() {
    return $(this.selector);
};

InputMatrix.prototype.getInputNode = function(state, symbol) {
    let sti = STATES.indexOf(state);
    let smbi = SYMBOLS.indexOf(symbol);
    if (sti === -1 || smbi === -1){
        console.error("Wrong state " + state + " or/and symbol " + symbol + " was given to getRule function!");
        return undefined;
    }

    return this.getObject().children()[0].rows[sti + 1].cells[smbi + 1].childNodes[0];
};

InputMatrix.prototype.getRule = function(state, symbol){
    return new Rule(this.getInputNode(state, symbol).value);
};

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

let turing;

$(document).ready(function(){
    turing = new Turing();

    $("#execute_limiter_inp").val(lastLimit);

    $(".inputmatrix_inp").keypress(function(e){
        let val = $(this).val();
        let key = String.fromCharCode(e.which);

        if (val.length >= 0) {
            if (val.length >= 1) {
                if (val.length >= 2) {
                    if (val.length >= 3) {
                        if (val.length === 3 && MOVES.indexOf(key.toUpperCase()) !== -1){
                            $(this).val(val + key.toUpperCase());
                        }
                        return false;
                    } else if (key.toUpperCase() === 'S'){
                        $(this).val(val + 'S');
                        return false;
                    } else if (!(+key >= 0 && +key <= 2)) return false;
                } else if (!(+key <= 4 && +key >= 0)) return false;
            } else if (key !== 'q') return false;
        }
    });

    $("#execute_limiter_inp").keyup(function(){
        let old_val = $(this).val();
        $(this).val(Math.min(old_val, MAX_EXECUTION_LIMIT));
        limitChangedByUser = true;
        lastLimit = $(this).val()
    });

    $('#file_inp').change(function(){
        let file = $(this)[0].files[0];
        let fr = new FileReader();
        fr.readAsText(file);
        fr.onload = function(){

            let lines = fr.result.split('\n');
            $("#inputtape").val(lines[0]);

            for (let sti = 0; sti < STATES.length; sti++) {
                let stateData = lines[sti + 1].split(" ");
                for (let smbi = 0; smbi < SYMBOLS.length; smbi++) {

                    if (stateData[smbi] && stateData[smbi] !== EMPTY_RULE_SAVE_PLACEHOLDER){
                        turing.inputMatrix.getInputNode(STATES[sti], SYMBOLS[smbi]).value = stateData[smbi];
                    }
                }
            }

        };
    });

    $('.tape').keypress(function(e){
        let val = $(this).val();
        let key = String.fromCharCode(e.which);

        switch (key) {
            case 's':
            case 'S':
            case '0':
            case '1':
            case '2':
                return true;
            case '[':
            case ']':
                return val.split(key).length - 1 <= 1;
            default:
                return false;
        }
    });

    $("#step-inp").click(function () {
        turing.stopStepper();
        turing.step();
    });

    $("#run-inp").click(function () {
        turing.run();
    });

    $("#reset-inp").click(function () {
        turing.stop();
    });

    $("#save-button").click(function () {
        let now = new Date();
        let filename = now.toISOString() + ".tp";
        let text = $("#inputtape").val() + "\n";
        for (let state of STATES) {
            for (let symbol of SYMBOLS) {
                let currentRepresentation = $.trim(turing.inputMatrix.getInputNode(state, symbol).value);
                text += (currentRepresentation === "" ? EMPTY_RULE_SAVE_PLACEHOLDER : currentRepresentation) + " ";
            }
            text += "\n"
        }
        download(filename, text);
    });
});

