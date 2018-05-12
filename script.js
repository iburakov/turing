// -- RULE OBJECT --
function Rule(str) {
    this.next_state = str.substring(0, 2);
    this.new_symbol = str[2];
    this.move = str[3];
}

Rule.prototype.moves = function() {
    return ['C', 'R', 'L'];
};

var moves = ['C', 'R', 'L'];

Rule.prototype.states = function() {
    return ['q0', 'q1', 'q2', 'q3', 'q4'];
};

Rule.prototype.symbols = function() {
    return ['S', '0', '1', '2'];
};
// -----------------

// // - TAPE NODE OBJECT -
// function TapeNode(prev, next, symb) {
//     this.prev = prev;
//     this.next = next;
//     this.symb = symb;
// }
// // --------------------

// - TAPE OBJECT -
function InputTape(jqobj) {
    if (!jqobj) console.error("jqobj requered!");
    this.jqobj = jqobj;
    jqobj.html('<input type="text" maxlength="1" class="tapecell" value="S">'.repeat(3));
    $(".tapecell").keypress(tapecellKeypressHandler);
    this.symbols = ['S', 'S', 'S'];
}

InputTape.prototype.append = function(symb = 'S') {
    this.jqobj.append('<input type="text" maxlength="1" class="tapecell" value="' + symb + '">');
    $(".tapecell").keypress(tapecellKeypressHandler);
    this.symbols.push(symb);
};

InputTape.prototype.prepend = function(symb = 'S') {
    this.jqobj.prepend('<input type="text" maxlength="1" class="tapecell" value="' + symb + '">')  
    $(".tapecell").keypress(tapecellKeypressHandler);
    this.symbols.unshift(symb);
};

InputTape.prototype.update = function(position, new_symbol) {
    this.symbols[position] = new_symbol;
    this.jqobj.children()[position].value = new_symbol;
    this.jqobj.children()[position].onkeypress({which: String.charCodeAt(new_symbol)});
};

// --------------------

// - TURING OBJECT -
function Turing() {
    function makeRow() {
        return {S: undefined, 0: undefined, 1: undefined, 2: undefined};
    }
    this.rules = {q1: makeRow(), q2: makeRow(), q3: makeRow(), q4: makeRow()};
    this.input_tape = new InputTape($("#inputtape"));
    this.state = 'q1';
    this.position = 0;
}

Turing.prototype.Step = function() {
    var rule = this.rules[this.state][this.input_tape.symbols[this.position]];
    this.input_tape.update(this.position, rule.new_symbol)
    this.state = rule.next_state;
    if (rule.move == 'R') this.position++;
    else if (rule.move == 'L') this.position--;

};
// -----------------

var turing;

function tapecellKeypressHandler(e){
    var key = String.fromCharCode(e.which);
    var is_pushing_new_key = true;
    if (key.toUpperCase() === 'S'){
        $(this).val('S');
        is_pushing_new_key = false;
    } else if (!(+key >= 0 && +key <= 2)) return false;

    var inputchildren = turing.input_tape.jqobj.children().toArray();
    if (inputchildren.indexOf($(this)[0]) == inputchildren.length - 1) {
        turing.input_tape.append();
    } else if (inputchildren.indexOf($(this)[0]) == 0) {
        turing.input_tape.prepend();
    }

    return is_pushing_new_key;
}

$(document).ready(function(){
    turing = new Turing();

    $(".inputmatrix_inp").keypress(function(e){
        var val = $(this).val();
        var key = String.fromCharCode(e.which);
        if (val.length >= 0) {
            if (val.length >= 1) {
                if (val.length >= 2) {
                    if (val.length >= 3) {
                        if (moves.indexOf(key.toUpperCase()) !== -1){
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
        var val = $(this).val();
        $(this).val(Math.min(val, 1e6));
    });

    $('#file_inp').change(function(){
        var file = $(this)[0].files[0];
        var fr = new FileReader();
        fr.readAsText(file);
        fr.onload = function(){
            var dataToImport = fr.result;

            console.log(dataToImport);
        };
    });
});

