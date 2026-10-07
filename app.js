/**
 * Universal Turing Machine (UTM) Encoder & Simulator Engine
 * Theory of Computation Educational Tool
 */

// Register Service Worker for offline PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.log('SW registration skipped/failed in this context:', err);
    });
  });
}

// Preset Definitions
const PRESETS = {
  endingIn1: {
    name: "Binary ending in '1'",
    states: "q0, qaccept, qreject",
    inputAlphabet: "0, 1",
    tapeAlphabet: "0, 1, B",
    initialState: "q0",
    acceptState: "qaccept",
    rejectState: "qreject",
    inputString: "0011",
    transitions: [
      { currentState: "q0", readSymbol: "0", nextState: "q0", writeSymbol: "0", move: "R" },
      { currentState: "q0", readSymbol: "1", nextState: "qaccept", writeSymbol: "1", move: "S" },
      { currentState: "q0", readSymbol: "B", nextState: "qreject", writeSymbol: "B", move: "S" }
    ]
  },
  evenZeros: {
    name: "Even number of 0s",
    states: "q0, q1, qaccept, qreject",
    inputAlphabet: "0, 1",
    tapeAlphabet: "0, 1, B",
    initialState: "q0",
    acceptState: "qaccept",
    rejectState: "qreject",
    inputString: "0100",
    transitions: [
      { currentState: "q0", readSymbol: "0", nextState: "q1", writeSymbol: "0", move: "R" },
      { currentState: "q0", readSymbol: "1", nextState: "q0", writeSymbol: "1", move: "R" },
      { currentState: "q0", readSymbol: "B", nextState: "qaccept", writeSymbol: "B", move: "S" },
      { currentState: "q1", readSymbol: "0", nextState: "q0", writeSymbol: "0", move: "R" },
      { currentState: "q1", readSymbol: "1", nextState: "q1", writeSymbol: "1", move: "R" },
      { currentState: "q1", readSymbol: "B", nextState: "qreject", writeSymbol: "B", move: "S" }
    ]
  },
  unaryInc: {
    name: "Unary Incrementer (111 → 1111)",
    states: "q0, qaccept, qreject",
    inputAlphabet: "1",
    tapeAlphabet: "1, B",
    initialState: "q0",
    acceptState: "qaccept",
    rejectState: "qreject",
    inputString: "111",
    transitions: [
      { currentState: "q0", readSymbol: "1", nextState: "q0", writeSymbol: "1", move: "R" },
      { currentState: "q0", readSymbol: "B", nextState: "qaccept", writeSymbol: "1", move: "S" }
    ]
  }
};

// Global Application State
const AppState = {
  tm: {
    states: [],
    inputAlphabet: [],
    tapeAlphabet: [],
    initialState: '',
    acceptState: '',
    rejectState: '',
    transitions: []
  },
  encodedData: null,
  simulator: null
};

// DOM Elements
const DOM = {};

function initDOMReferences() {
  DOM.statesInput = document.getElementById('statesInput');
  DOM.inputAlphabetInput = document.getElementById('inputAlphabetInput');
  DOM.tapeAlphabetInput = document.getElementById('tapeAlphabetInput');
  DOM.initialStateInput = document.getElementById('initialStateInput');
  DOM.acceptStateInput = document.getElementById('acceptStateInput');
  DOM.rejectStateInput = document.getElementById('rejectStateInput');
  DOM.sampleMachineSelect = document.getElementById('sampleMachineSelect');
  DOM.loadSampleBtn = document.getElementById('loadSampleBtn');
  
  DOM.transitionTableBody = document.getElementById('transitionTableBody');
  DOM.addTransitionRowBtn = document.getElementById('addTransitionRowBtn');
  DOM.validationErrorBox = document.getElementById('validationErrorBox');
  DOM.validationSuccessBox = document.getElementById('validationSuccessBox');
  DOM.validateBtn = document.getElementById('validateBtn');
  DOM.encodeBtn = document.getElementById('encodeBtn');
  
  DOM.stateEncodingDisplay = document.getElementById('stateEncodingDisplay');
  DOM.symbolEncodingDisplay = document.getElementById('symbolEncodingDisplay');
  DOM.encodedTransitionsBody = document.getElementById('encodedTransitionsBody');
  DOM.serializedTMDisplay = document.getElementById('serializedTMDisplay');
  DOM.copyEncodingBtn = document.getElementById('copyEncodingBtn');
  
  DOM.inputStringField = document.getElementById('inputStringField');
  DOM.inputErrorBox = document.getElementById('inputErrorBox');
  DOM.runUtmBtn = document.getElementById('runUtmBtn');
  DOM.stepUtmBtn = document.getElementById('stepUtmBtn');
  DOM.resetUtmBtn = document.getElementById('resetUtmBtn');
  
  DOM.simStatusPill = document.getElementById('simStatusPill');
  DOM.simStatusText = document.getElementById('simStatusText');
  DOM.tapeTrack = document.getElementById('tapeTrack');
  DOM.currentHeadPosDisplay = document.getElementById('currentHeadPosDisplay');
  DOM.currentStateDisplay = document.getElementById('currentStateDisplay');
  DOM.currentReadSymbolDisplay = document.getElementById('currentReadSymbolDisplay');
  DOM.currentStepCountDisplay = document.getElementById('currentStepCountDisplay');
  DOM.traceTableBody = document.getElementById('traceTableBody');
  
  DOM.resultDisplayBox = document.getElementById('resultDisplayBox');
  DOM.resultVerdictText = document.getElementById('resultVerdictText');
  DOM.resStepsValue = document.getElementById('resStepsValue');
  DOM.resFinalStateValue = document.getElementById('resFinalStateValue');
  DOM.resFinalTapeValue = document.getElementById('resFinalTapeValue');
  
  DOM.testCaseBtns = document.querySelectorAll('.test-case-btn');
}

/**
 * Parses user comma-separated strings into cleaned arrays
 */
function parseCommaList(str) {
  if (!str) return [];
  return str.split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Read current UI values into AppState.tm
 */
function readTMFromUI() {
  const states = parseCommaList(DOM.statesInput.value);
  const inputAlphabet = parseCommaList(DOM.inputAlphabetInput.value);
  let tapeAlphabet = parseCommaList(DOM.tapeAlphabetInput.value);
  
  if (!tapeAlphabet.includes('B')) {
    tapeAlphabet.push('B');
  }

  const initialState = DOM.initialStateInput.value.trim();
  const acceptState = DOM.acceptStateInput.value.trim();
  const rejectState = DOM.rejectStateInput.value.trim();

  const transitions = [];
  const rows = DOM.transitionTableBody.querySelectorAll('tr.trans-row');
  rows.forEach(row => {
    const currentState = row.querySelector('.col-current-state').value.trim();
    const readSymbol = row.querySelector('.col-read-symbol').value.trim();
    const nextState = row.querySelector('.col-next-state').value.trim();
    const writeSymbol = row.querySelector('.col-write-symbol').value.trim();
    const move = row.querySelector('.col-move').value.trim().toUpperCase();
    
    transitions.push({
      currentState,
      readSymbol,
      nextState,
      writeSymbol,
      move
    });
  });

  AppState.tm = {
    states,
    inputAlphabet,
    tapeAlphabet,
    initialState,
    acceptState,
    rejectState,
    transitions
  };

  return AppState.tm;
}

/**
 * Load a preset machine into the UI
 */
function loadPreset(key) {
  const preset = PRESETS[key] || PRESETS.endingIn1;
  
  DOM.statesInput.value = preset.states;
  DOM.inputAlphabetInput.value = preset.inputAlphabet;
  DOM.tapeAlphabetInput.value = preset.tapeAlphabet;
  DOM.initialStateInput.value = preset.initialState;
  DOM.acceptStateInput.value = preset.acceptState;
  DOM.rejectStateInput.value = preset.rejectState;
  DOM.inputStringField.value = preset.inputString;

  // Render transitions
  DOM.transitionTableBody.innerHTML = '';
  preset.transitions.forEach(t => {
    addTransitionRow(t.currentState, t.readSymbol, t.nextState, t.writeSymbol, t.move);
  });

  hideErrors();
  encodeTM();
}

/**
 * Add a row to the transition table
 */
function addTransitionRow(currentState = '', readSymbol = '', nextState = '', writeSymbol = '', move = 'R') {
  const tr = document.createElement('tr');
  tr.className = 'trans-row';
  
  tr.innerHTML = `
    <td><input type="text" class="col-current-state" value="${escapeHtml(currentState)}" placeholder="q0"></td>
    <td><input type="text" class="col-read-symbol" value="${escapeHtml(readSymbol)}" placeholder="0" maxlength="1"></td>
    <td><input type="text" class="col-next-state" value="${escapeHtml(nextState)}" placeholder="q1"></td>
    <td><input type="text" class="col-write-symbol" value="${escapeHtml(writeSymbol)}" placeholder="0" maxlength="1"></td>
    <td>
      <select class="col-move">
        <option value="L" ${move === 'L' ? 'selected' : ''}>L (Left)</option>
        <option value="R" ${move === 'R' ? 'selected' : ''}>R (Right)</option>
        <option value="S" ${move === 'S' ? 'selected' : ''}>S (Stay)</option>
      </select>
    </td>
    <td>
      <button type="button" class="btn-danger-sm delete-row-btn" title="Remove transition">✕</button>
    </td>
  `;

  tr.querySelector('.delete-row-btn').addEventListener('click', () => {
    tr.remove();
  });

  DOM.transitionTableBody.appendChild(tr);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

/**
 * 5. VALIDATION
 * Validate TM specification and transition table
 */
function validateTM(tm) {
  const errors = [];
  
  if (tm.states.length === 0) errors.push("No states defined.");
  if (tm.inputAlphabet.length === 0) errors.push("Input alphabet cannot be empty.");
  if (tm.tapeAlphabet.length === 0) errors.push("Tape alphabet cannot be empty.");
  
  if (!tm.initialState) errors.push("Initial state is required.");
  else if (!tm.states.includes(tm.initialState)) errors.push(`Initial state "${tm.initialState}" does not exist in States list.`);
  
  if (!tm.acceptState) errors.push("Accept state is required.");
  else if (!tm.states.includes(tm.acceptState)) errors.push(`Accept state "${tm.acceptState}" does not exist in States list.`);
  
  if (!tm.rejectState) errors.push("Reject state is required.");
  else if (!tm.states.includes(tm.rejectState)) errors.push(`Reject state "${tm.rejectState}" does not exist in States list.`);

  // Tape alphabet must contain blank 'B'
  if (!tm.tapeAlphabet.includes('B')) {
    errors.push("Tape alphabet must include the blank symbol 'B'.");
  }

  // All input alphabet symbols must be in tape alphabet
  for (const sym of tm.inputAlphabet) {
    if (!tm.tapeAlphabet.includes(sym)) {
      errors.push(`Input symbol "${sym}" must be present in Tape Alphabet.`);
    }
  }

  // Transition table validations
  const seenPairs = new Set();
  tm.transitions.forEach((t, index) => {
    const rowNum = index + 1;
    if (!t.currentState) errors.push(`Row ${rowNum}: Current state is empty.`);
    else if (!tm.states.includes(t.currentState)) errors.push(`Row ${rowNum}: Current state "${t.currentState}" does not exist in States list.`);
    
    if (!t.nextState) errors.push(`Row ${rowNum}: Next state is empty.`);
    else if (!tm.states.includes(t.nextState)) errors.push(`Row ${rowNum}: Next state "${t.nextState}" does not exist in States list.`);
    
    if (!t.readSymbol) errors.push(`Row ${rowNum}: Read symbol is empty.`);
    else if (!tm.tapeAlphabet.includes(t.readSymbol)) errors.push(`Row ${rowNum}: Read symbol "${t.readSymbol}" is not in Tape Alphabet.`);
    
    if (!t.writeSymbol) errors.push(`Row ${rowNum}: Write symbol is empty.`);
    else if (!tm.tapeAlphabet.includes(t.writeSymbol)) errors.push(`Row ${rowNum}: Write symbol "${t.writeSymbol}" is not in Tape Alphabet.`);
    
    if (!['L', 'R', 'S'].includes(t.move)) errors.push(`Row ${rowNum}: Move must be 'L', 'R', or 'S'. Found "${t.move}".`);
    
    // Deterministic check: No duplicate (currentState, readSymbol)
    const key = `${t.currentState}::${t.readSymbol}`;
    if (seenPairs.has(key)) {
      errors.push(`Duplicate transition: A deterministic rule for (${t.currentState}, '${t.readSymbol}') already exists.`);
    } else {
      seenPairs.add(key);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

function showValidationErrors(errors) {
  DOM.validationErrorBox.innerHTML = `<strong>Validation Failed:</strong><ul style="margin-left: 20px; margin-top: 6px;">` + 
    errors.map(e => `<li>${escapeHtml(e)}</li>`).join('') + `</ul>`;
  DOM.validationErrorBox.classList.remove('hidden');
  DOM.validationSuccessBox.classList.add('hidden');
}

function showValidationSuccess(msg) {
  DOM.validationSuccessBox.innerHTML = `<strong>✓ ${escapeHtml(msg)}</strong>`;
  DOM.validationSuccessBox.classList.remove('hidden');
  DOM.validationErrorBox.classList.add('hidden');
}

function hideErrors() {
  DOM.validationErrorBox.classList.add('hidden');
  DOM.validationSuccessBox.classList.add('hidden');
  DOM.inputErrorBox.classList.add('hidden');
}

/**
 * 6. UTM ENCODING
 * Unary-to-Binary Canonical Encoding:
 * 1 -> "1", 2 -> "11", 3 -> "111", etc.
 * Moves: L -> 1, R -> 2 (11), S -> 3 (111)
 * Transition: stateCode 0 readCode 0 nextStateCode 0 writeCode 0 moveCode
 * Delimiter between transitions: 00
 */
function toUnary(n) {
  return "1".repeat(n);
}

function encodeTM() {
  const tm = readTMFromUI();
  const valResult = validateTM(tm);
  
  if (!valResult.valid) {
    showValidationErrors(valResult.errors);
    return false;
  }
  
  showValidationSuccess("Turing Machine validated successfully!");

  // 1. Assign unique integer to states
  // Keep canonical order: initial state first, then others, accept, reject
  const orderedStates = [];
  if (tm.states.includes(tm.initialState)) orderedStates.push(tm.initialState);
  tm.states.forEach(s => {
    if (!orderedStates.includes(s) && s !== tm.acceptState && s !== tm.rejectState) {
      orderedStates.push(s);
    }
  });
  if (tm.states.includes(tm.acceptState) && !orderedStates.includes(tm.acceptState)) orderedStates.push(tm.acceptState);
  if (tm.states.includes(tm.rejectState) && !orderedStates.includes(tm.rejectState)) orderedStates.push(tm.rejectState);

  const stateToId = {};
  const idToState = {};
  orderedStates.forEach((state, idx) => {
    const id = idx + 1;
    stateToId[state] = id;
    idToState[id] = state;
  });

  // 2. Assign unique integer to tape symbols
  // Order: input alphabet symbols first, then blank 'B', then remaining
  const orderedSymbols = [];
  tm.inputAlphabet.forEach(s => {
    if (!orderedSymbols.includes(s)) orderedSymbols.push(s);
  });
  if (tm.tapeAlphabet.includes('B') && !orderedSymbols.includes('B')) {
    orderedSymbols.push('B');
  }
  tm.tapeAlphabet.forEach(s => {
    if (!orderedSymbols.includes(s)) orderedSymbols.push(s);
  });

  const symbolToId = {};
  const idToSymbol = {};
  orderedSymbols.forEach((sym, idx) => {
    const id = idx + 1;
    symbolToId[sym] = id;
    idToSymbol[id] = sym;
  });

  // Moves encoding: L -> 1, R -> 2, S -> 3
  const moveMap = { 'L': 1, 'R': 2, 'S': 3 };
  const idToMove = { 1: 'L', 2: 'R', 3: 'S' };

  // Encode each transition
  const encodedTransitions = [];
  const serializedParts = [];
  
  tm.transitions.forEach(t => {
    const stateId = stateToId[t.currentState];
    const readId = symbolToId[t.readSymbol];
    const nextStateId = stateToId[t.nextState];
    const writeId = symbolToId[t.writeSymbol];
    const moveId = moveMap[t.move];

    const uState = toUnary(stateId);
    const uRead = toUnary(readId);
    const uNextState = toUnary(nextStateId);
    const uWrite = toUnary(writeId);
    const uMove = toUnary(moveId);

    // Component format separated by 0
    const rawTransition = `${uState}0${uRead}0${uNextState}0${uWrite}0${uMove}`;
    const visualFormat = `${uState}|${uRead}|${uNextState}|${uWrite}|${uMove}`;

    encodedTransitions.push({
      original: t,
      stateId, readId, nextStateId, writeId, moveId,
      uState, uRead, uNextState, uWrite, uMove,
      rawTransition,
      visualFormat
    });

    serializedParts.push(rawTransition);
  });

  // Complete serialized binary string separated by '00'
  const serializedTMString = serializedParts.join('00');

  AppState.encodedData = {
    stateToId,
    idToState,
    symbolToId,
    idToSymbol,
    idToMove,
    orderedStates,
    orderedSymbols,
    encodedTransitions,
    serializedTMString,
    initialState: tm.initialState,
    acceptState: tm.acceptState,
    rejectState: tm.rejectState
  };

  // Render Section 3 Display
  renderEncodingDisplay(AppState.encodedData);
  
  return true;
}

/**
 * 7. DISPLAY THE ENCODING
 */
function renderEncodingDisplay(enc) {
  // State encodings
  let stateHtml = '';
  enc.orderedStates.forEach(s => {
    const id = enc.stateToId[s];
    stateHtml += `<div><strong>${escapeHtml(s)}</strong> → ${toUnary(id)} <small class="text-dim">(${id})</small></div>`;
  });
  DOM.stateEncodingDisplay.innerHTML = stateHtml;

  // Symbol encodings
  let symHtml = '';
  enc.orderedSymbols.forEach(s => {
    const id = enc.symbolToId[s];
    symHtml += `<div><strong>${escapeHtml(s)}</strong> → ${toUnary(id)} <small class="text-dim">(${id})</small></div>`;
  });
  DOM.symbolEncodingDisplay.innerHTML = symHtml;

  // Transition breakdown table
  if (enc.encodedTransitions.length === 0) {
    DOM.encodedTransitionsBody.innerHTML = '<tr class="empty-row"><td colspan="3">No transitions specified.</td></tr>';
  } else {
    DOM.encodedTransitionsBody.innerHTML = enc.encodedTransitions.map(et => {
      const orig = et.original;
      return `
        <tr>
          <td><code>(${orig.currentState}, '${orig.readSymbol}') → (${orig.nextState}, '${orig.writeSymbol}', ${orig.move})</code></td>
          <td class="monospace">${et.visualFormat}</td>
          <td class="monospace"><strong>${et.rawTransition}</strong></td>
        </tr>
      `;
    }).join('');
  }

  // Serialized full TM string
  DOM.serializedTMDisplay.textContent = enc.serializedTMString || "(Empty Machine)";
}

/**
 * 8. UTM SIMULATOR ENGINE (CRITICAL REQUIREMENT)
 * The engine MUST receive:
 * 1. Encoded transition table string + mappings
 * 2. Input string
 * 
 * The engine decodes the encoded representation internally:
 * Serialized TM String -> UTM Decoder -> Reconstructed Transition Rules -> UTM Simulator
 */
class UTMSimulatorEngine {
  constructor(serializedTMString, stateDecoderMap, symbolDecoderMap, moveDecoderMap, initialState, acceptState, rejectState) {
    this.serializedTMString = serializedTMString;
    this.stateDecoderMap = stateDecoderMap;
    this.symbolDecoderMap = symbolDecoderMap;
    this.moveDecoderMap = moveDecoderMap;
    
    this.initialState = initialState;
    this.acceptState = acceptState;
    this.rejectState = rejectState;

    // Internal reconstructed transition rules table
    this.reconstructedRules = new Map();
    this.decodeSerializedMachine();

    // Simulation runtime state
    this.tape = [];
    this.head = 0;
    this.currentState = this.initialState;
    this.stepCount = 0;
    this.maxSteps = 10000;
    this.trace = [];
    this.status = 'READY'; // READY, RUNNING, ACCEPTED, REJECTED, HALTED_NO_TRANSITION, STEP_LIMIT_REACHED
  }

  /**
   * Internal UTM Decoder:
   * Reconstructs transition rules directly from serialized string representation.
   */
  decodeSerializedMachine() {
    this.reconstructedRules.clear();
    if (!this.serializedTMString) return;

    // Transitions are delimited by '00'
    const transitionBlocks = this.serializedTMString.split('00').filter(b => b.length > 0);
    
    for (const block of transitionBlocks) {
      // Components delimited by single '0'
      const components = block.split('0');
      if (components.length !== 5) {
        console.warn("Invalid encoded transition block:", block);
        continue;
      }

      // Convert unary strings (count of '1's) to integer IDs
      const stateId = components[0].length;
      const readId = components[1].length;
      const nextStateId = components[2].length;
      const writeId = components[3].length;
      const moveId = components[4].length;

      // Decode IDs back to actual symbols and states
      const currentState = this.stateDecoderMap[stateId];
      const readSymbol = this.symbolDecoderMap[readId];
      const nextState = this.stateDecoderMap[nextStateId];
      const writeSymbol = this.symbolDecoderMap[writeId];
      const move = this.moveDecoderMap[moveId] || 'S';

      if (currentState && readSymbol && nextState && writeSymbol) {
        const key = `${currentState}::${readSymbol}`;
        this.reconstructedRules.set(key, {
          currentState,
          readSymbol,
          nextState,
          writeSymbol,
          move
        });
      }
    }
  }

  /**
   * Initialize tape and head with input string
   */
  loadInput(inputStr) {
    this.tape = inputStr.length > 0 ? inputStr.split('') : ['B'];
    this.head = 0;
    this.currentState = this.initialState;
    this.stepCount = 0;
    this.trace = [];
    this.status = 'READY';

    // Record initial step 0 snapshot
    const initialRead = this.getTapeSymbolAt(this.head);
    this.trace.push({
      step: 0,
      state: this.currentState,
      read: initialRead,
      write: '-',
      move: '-',
      head: this.head,
      tapeSnapshot: this.getTapeString()
    });

    // Check immediate halt at step 0 if initial state is already accept/reject
    if (this.currentState === this.acceptState) {
      this.status = 'ACCEPTED';
    } else if (this.currentState === this.rejectState) {
      this.status = 'REJECTED';
    }
  }

  getTapeSymbolAt(index) {
    if (index < 0 || index >= this.tape.length) {
      return 'B';
    }
    return this.tape[index] || 'B';
  }

  setTapeSymbolAt(index, symbol) {
    if (index >= this.tape.length) {
      while (this.tape.length <= index) {
        this.tape.push('B');
      }
    } else if (index < 0) {
      // Extend left
      const prependCount = Math.abs(index);
      for (let i = 0; i < prependCount; i++) {
        this.tape.unshift('B');
      }
      this.head += prependCount;
      index = 0;
    }
    this.tape[index] = symbol;
  }

  getTapeString() {
    return this.tape.join('');
  }

  /**
   * Execute single simulation transition
   */
  step() {
    if (this.status !== 'READY' && this.status !== 'RUNNING') {
      return { done: true, status: this.status };
    }

    this.status = 'RUNNING';

    // Check halt states
    if (this.currentState === this.acceptState) {
      this.status = 'ACCEPTED';
      return { done: true, status: this.status };
    }
    if (this.currentState === this.rejectState) {
      this.status = 'REJECTED';
      return { done: true, status: this.status };
    }
    if (this.stepCount >= this.maxSteps) {
      this.status = 'STEP_LIMIT_REACHED';
      return { done: true, status: this.status };
    }

    // Read tape symbol
    const currentRead = this.getTapeSymbolAt(this.head);
    const ruleKey = `${this.currentState}::${currentRead}`;
    const rule = this.reconstructedRules.get(ruleKey);

    if (!rule) {
      this.status = 'HALTED_NO_TRANSITION';
      return { done: true, status: this.status };
    }

    // Apply rule: Write symbol
    this.setTapeSymbolAt(this.head, rule.writeSymbol);

    // Apply rule: Move head
    if (rule.move === 'R') {
      this.head += 1;
      if (this.head >= this.tape.length) {
        this.tape.push('B');
      }
    } else if (rule.move === 'L') {
      if (this.head === 0) {
        this.tape.unshift('B');
      } else {
        this.head -= 1;
      }
    }
    // 'S' stays

    // Apply rule: Next state
    this.currentState = rule.nextState;
    this.stepCount += 1;

    // Record trace
    this.trace.push({
      step: this.stepCount,
      state: this.currentState,
      read: this.getTapeSymbolAt(this.head),
      write: rule.writeSymbol,
      move: rule.move,
      head: this.head,
      tapeSnapshot: this.getTapeString()
    });

    // Check terminal condition after transition
    if (this.currentState === this.acceptState) {
      this.status = 'ACCEPTED';
      return { done: true, status: this.status };
    }
    if (this.currentState === this.rejectState) {
      this.status = 'REJECTED';
      return { done: true, status: this.status };
    }
    if (this.stepCount >= this.maxSteps) {
      this.status = 'STEP_LIMIT_REACHED';
      return { done: true, status: this.status };
    }

    return { done: false, status: this.status };
  }

  /**
   * Run until machine halts or step limit is reached
   */
  runAll() {
    let safetyCounter = 0;
    while (this.status === 'READY' || this.status === 'RUNNING') {
      const res = this.step();
      if (res.done) break;
      
      safetyCounter++;
      if (safetyCounter > this.maxSteps + 100) {
        this.status = 'STEP_LIMIT_REACHED';
        break;
      }
    }
    return this.status;
  }
}

/**
 * 9. INPUT STRING VALIDATION
 */
function validateInputString(inputStr, inputAlphabet) {
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    if (!inputAlphabet.includes(char)) {
      return {
        valid: false,
        error: `Input string contains symbol '${char}' which is not in the declared Input Alphabet Σ: {${inputAlphabet.join(', ')}}`
      };
    }
  }
  return { valid: true };
}

/**
 * Update UI for simulation step
 */
function renderSimulationView() {
  const sim = AppState.simulator;
  if (!sim) return;

  // Status Pill
  DOM.simStatusPill.className = 'sim-status-box';
  if (sim.status === 'RUNNING') {
    DOM.simStatusPill.classList.add('running');
    DOM.simStatusText.textContent = 'Running...';
  } else if (sim.status === 'ACCEPTED') {
    DOM.simStatusPill.classList.add('accepted');
    DOM.simStatusText.textContent = 'ACCEPT';
  } else if (sim.status === 'REJECTED') {
    DOM.simStatusPill.classList.add('rejected');
    DOM.simStatusText.textContent = 'REJECT';
  } else if (sim.status === 'HALTED_NO_TRANSITION') {
    DOM.simStatusText.textContent = 'HALTED (NO RULE)';
  } else if (sim.status === 'STEP_LIMIT_REACHED') {
    DOM.simStatusText.textContent = 'LIMIT REACHED';
  } else {
    DOM.simStatusText.textContent = 'Ready';
  }

  // Meta displays
  DOM.currentHeadPosDisplay.textContent = sim.head;
  DOM.currentStateDisplay.textContent = sim.currentState;
  DOM.currentReadSymbolDisplay.textContent = sim.getTapeSymbolAt(sim.head);
  DOM.currentStepCountDisplay.textContent = sim.stepCount;

  // Render Interactive Tape Track
  renderTapeTrack(sim);

  // Render Trace Table
  renderTraceTable(sim);

  // Render Final Result Card
  renderResult(sim);
}

function renderTapeTrack(sim) {
  DOM.tapeTrack.innerHTML = '';
  
  // Ensure we display at least head + 5 cells
  const visibleLength = Math.max(sim.tape.length, sim.head + 4, 8);
  
  for (let i = 0; i < visibleLength; i++) {
    const sym = i < sim.tape.length ? sim.tape[i] : 'B';
    const cell = document.createElement('div');
    cell.className = 'tape-cell';
    if (i === sim.head) {
      cell.classList.add('active-head');
    }
    
    cell.innerHTML = `
      <span class="cell-index">${i}</span>
      <span>${escapeHtml(sym)}</span>
    `;
    DOM.tapeTrack.appendChild(cell);
  }

  // Scroll active cell into view smoothly
  const activeEl = DOM.tapeTrack.querySelector('.active-head');
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

function renderTraceTable(sim) {
  if (sim.trace.length === 0) {
    DOM.traceTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No execution trace yet.</td></tr>';
    return;
  }

  DOM.traceTableBody.innerHTML = sim.trace.map(t => {
    // Format tape with head marker for table
    let markedTape = '';
    const snap = t.tapeSnapshot;
    for (let i = 0; i < snap.length; i++) {
      if (i === t.head) {
        markedTape += `<span class="head-marker">${escapeHtml(snap[i])}</span>`;
      } else {
        markedTape += escapeHtml(snap[i]);
      }
    }

    return `
      <tr>
        <td><strong>${t.step}</strong></td>
        <td><code>${escapeHtml(t.state)}</code></td>
        <td class="monospace">${escapeHtml(t.read)}</td>
        <td class="monospace">${escapeHtml(t.write)}</td>
        <td><span class="badge">${t.move}</span></td>
        <td>${t.head}</td>
        <td class="monospace">${markedTape}</td>
      </tr>
    `;
  }).join('');

  // Auto-scroll trace table container to bottom
  const container = DOM.traceTableBody.closest('.trace-table-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * 12. FINAL RESULT
 */
function renderResult(sim) {
  DOM.resultVerdictText.className = 'result-verdict';
  DOM.resStepsValue.textContent = sim.stepCount;
  DOM.resFinalStateValue.textContent = sim.currentState;
  DOM.resFinalTapeValue.textContent = sim.getTapeString();

  if (sim.status === 'ACCEPTED') {
    DOM.resultVerdictText.textContent = 'ACCEPT';
    DOM.resultVerdictText.classList.add('accept');
  } else if (sim.status === 'REJECTED') {
    DOM.resultVerdictText.textContent = 'REJECT';
    DOM.resultVerdictText.classList.add('reject');
  } else if (sim.status === 'HALTED_NO_TRANSITION') {
    DOM.resultVerdictText.textContent = 'HALTED - NO TRANSITION';
    DOM.resultVerdictText.classList.add('halted');
  } else if (sim.status === 'STEP_LIMIT_REACHED') {
    DOM.resultVerdictText.textContent = 'STEP LIMIT REACHED';
    DOM.resultVerdictText.classList.add('halted');
  } else {
    DOM.resultVerdictText.textContent = '—';
  }
}

/**
 * Start or run simulation
 */
function runUTMFull() {
  if (!encodeTM()) return;
  
  const inputStr = DOM.inputStringField.value.trim();
  const valInput = validateInputString(inputStr, AppState.tm.inputAlphabet);
  if (!valInput.valid) {
    DOM.inputErrorBox.textContent = valInput.error;
    DOM.inputErrorBox.classList.remove('hidden');
    return;
  }
  DOM.inputErrorBox.classList.add('hidden');

  // Instantiate simulator with decoded rules reconstructed from serialized string
  const enc = AppState.encodedData;
  AppState.simulator = new UTMSimulatorEngine(
    enc.serializedTMString,
    enc.idToState,
    enc.idToSymbol,
    enc.idToMove,
    enc.initialState,
    enc.acceptState,
    enc.rejectState
  );

  AppState.simulator.loadInput(inputStr);
  AppState.simulator.runAll();
  
  renderSimulationView();
}

function stepUTM() {
  if (!AppState.simulator || AppState.simulator.status === 'ACCEPTED' || AppState.simulator.status === 'REJECTED' || AppState.simulator.status === 'HALTED_NO_TRANSITION' || AppState.simulator.status === 'STEP_LIMIT_REACHED') {
    // Initialize new session
    if (!encodeTM()) return;
    const inputStr = DOM.inputStringField.value.trim();
    const valInput = validateInputString(inputStr, AppState.tm.inputAlphabet);
    if (!valInput.valid) {
      DOM.inputErrorBox.textContent = valInput.error;
      DOM.inputErrorBox.classList.remove('hidden');
      return;
    }
    DOM.inputErrorBox.classList.add('hidden');

    const enc = AppState.encodedData;
    AppState.simulator = new UTMSimulatorEngine(
      enc.serializedTMString,
      enc.idToState,
      enc.idToSymbol,
      enc.idToMove,
      enc.initialState,
      enc.acceptState,
      enc.rejectState
    );
    AppState.simulator.loadInput(inputStr);
    renderSimulationView();
    return;
  }

  AppState.simulator.step();
  renderSimulationView();
}

function resetUTM() {
  if (!encodeTM()) return;
  
  const inputStr = DOM.inputStringField.value.trim();
  const valInput = validateInputString(inputStr, AppState.tm.inputAlphabet);
  if (!valInput.valid) {
    DOM.inputErrorBox.textContent = valInput.error;
    DOM.inputErrorBox.classList.remove('hidden');
    return;
  }
  DOM.inputErrorBox.classList.add('hidden');

  const enc = AppState.encodedData;
  AppState.simulator = new UTMSimulatorEngine(
    enc.serializedTMString,
    enc.idToState,
    enc.idToSymbol,
    enc.idToMove,
    enc.initialState,
    enc.acceptState,
    enc.rejectState
  );

  AppState.simulator.loadInput(inputStr);
  renderSimulationView();
}

/**
 * Event Listeners & Bootstrapping
 */
function initEvents() {
  DOM.loadSampleBtn.addEventListener('click', () => {
    loadPreset(DOM.sampleMachineSelect.value);
  });

  DOM.addTransitionRowBtn.addEventListener('click', () => {
    addTransitionRow('', '', '', '', 'R');
  });

  DOM.validateBtn.addEventListener('click', () => {
    const tm = readTMFromUI();
    const res = validateTM(tm);
    if (res.valid) {
      showValidationSuccess("Turing Machine specification is fully valid and deterministic!");
    } else {
      showValidationErrors(res.errors);
    }
  });

  DOM.encodeBtn.addEventListener('click', () => {
    encodeTM();
  });

  DOM.runUtmBtn.addEventListener('click', () => {
    runUTMFull();
  });

  DOM.stepUtmBtn.addEventListener('click', () => {
    stepUTM();
  });

  DOM.resetUtmBtn.addEventListener('click', () => {
    resetUTM();
  });

  DOM.copyEncodingBtn.addEventListener('click', () => {
    const text = DOM.serializedTMDisplay.textContent.trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        DOM.copyEncodingBtn.textContent = 'Copied!';
        setTimeout(() => DOM.copyEncodingBtn.textContent = 'Copy String', 2000);
      });
    }
  });

  // Test case buttons
  DOM.testCaseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-input');
      DOM.inputStringField.value = val;
      runUTMFull();
    });
  });
}

// Window load
window.addEventListener('DOMContentLoaded', () => {
  initDOMReferences();
  initEvents();
  
  // Load default preset (Binary ending in 1)
  loadPreset('endingIn1');
});
