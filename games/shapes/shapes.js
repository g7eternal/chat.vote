/*jshint esversion: 11 */
let voters = [];

let elements = {
  //modals
  grid: document.getElementById("grid"),
  gameDiv: document.getElementById("gameDiv"),

  loginExpiredModal: document.getElementById("loginExpiredModal"),
  aboutModal: document.getElementById("aboutModal"),

  //navbar
  vtsLink: document.getElementById("vtsLink"),
  status: document.getElementById("status"),
  topRight: document.getElementById("topRight"),
  loginButton: document.getElementById("loginButton"),
  channelName: document.getElementById("channelName"),
  connectbtn: document.getElementById("connectbtn"),
  darkTheme: document.getElementById("darkTheme"),

  //main
  toastContainer: document.getElementById("toastContainer"),
};

let loginButton;
let darkTheme = true;

let loginExpiredModal, aboutModal;

let USER = {
  channel: "",
  twitchLogin: false,
  access_token: "",
  userID: "",
  platform: "",
};

function connect() {
  elements.status.innerHTML = `
  <h4>
  <span class="badge bg-warning">Connecting... 
  <div class="spinner-border" style="width:18px;height:18px;" role="status"><span class="visually-hidden">Loading...</span></div>
  </span>
  </h4>`;
  elements.topRight.innerHTML = `
  <div class="btn-group" role="group" aria-label="log in button group">
  <button type="button" class="btn btn-twitch"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></button>
  <div class="btn-group" role="group">
  <button id="btnGroupDropLogin" type="button" class="btn btn-twitch dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"></button>
  <ul class="dropdown-menu dropdown-menu-lg-end" aria-labelledby="btnGroupDrop1">
  <li><a class="dropdown-item" onclick="logout()" href="#"><i class="material-icons notranslate">logout</i>Log out</a></li>
  </ul>
  </div>
  </div>`;
  refreshData();
  let options = {
    options: {
      clientId: CLIENT_ID,
      debug: false,
    },
    connection: {
      secure: true,
      reconnect: true,
    },
    channels: [USER.channel],
  };
  client = new tmi.client(options);

  client.on("message", async (target, context, msg, self) => {
    let input = msg.split(" ").filter(Boolean);
    let vote_int = parseInt(input[0], 10);
    if (isNaN(vote_int)) {
      return;
    }
    if (vote_int > 0 && vote_int < 4) {
      if (!voters.includes(context.username)) {
        voters.push(context.username);
        let index = SHAPES.results.findIndex((obj) => obj.label == vote_int);
        SHAPES.results[index].data += 1;
        updateGraph("shapes");
        return;
      }
    }
  }); //message

  client.on("timeout", (channel, username, reason, duration, userstate) => {}); //timeout

  client.on("connected", async (address, port) => {
    console.log(`Connected to ${address}:${port}`);
    elements.status.innerHTML = `<h4><span class="badge bg-success">Connected :)</span></h4>`;
    saveSettings();
    sendUsername(`chat.vote/games/shapes`, USER.channel, USER.platform == "twitch" ? `twitch - ${USER.twitchLogin}` : "youtube");
    if (await checkTags(USER.userID, USER.access_token)) {
      elements.vtsLink.style.display = "";
    }
    loadPFP();
  }); //connected

  client.on("disconnected", (reason) => {
    elements.status.innerHTML = `<h4><span class="badge bg-danger">Disconnected: ${reason}</span></h4>`;
  }); //disconnected

  client.on("notice", (channel, msgid, message) => {
    elements.status.innerHTML = `<h4><span class="badge bg-danger">Disconnected: ${message}</span></h4>`;
  }); //notice

  client.connect().catch(console.error);
} //connect

window.onload = function () {
  darkTheme = (localStorage.getItem("darkTheme") || "true") === "true";
  elements.darkTheme.checked = darkTheme ?? true;
  switchTheme(elements.darkTheme.checked);

  loadAndConnect();

  if (!USER.channel) {
    loginButton = new bootstrap.Popover(elements.loginButton);
  }

  loginExpiredModal = new bootstrap.Modal(elements.loginExpiredModal);
  aboutModal = new bootstrap.Modal(elements.aboutModal);

  enableTooltips();
  enablePopovers();

  elements.channelName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      connect();
    }
  });

  elements.connectbtn.addEventListener("click", function () {
    connect();
  });

  elements.darkTheme.onchange = function () {
    switchTheme(this.checked);
    saveSettings();
  };

  initGraph();

  listeners();
}; //onload

function initGraph() {
  if (SHAPES.chart) {
    SHAPES.chart.destroy();
  }

  SHAPES.chart = new Chart(SHAPES.ctx, {
    type: "bar",
    data: {
      labels: ["1 - 0 Votes (0%)", "2 - 0 Votes (0%)", "3 - 0 Votes (0%)"],
      datasets: [
        {
          label: "score",
          data: [],
          borderWidth: 2,
        },
      ],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: "white",
          },
          beginAtZero: true,
        },
        y: {
          ticks: {
            textStrokeColor: "rgba(0,0,0,1)",
            textStrokeWidth: 3,
            color: "white",
            mirror: true,
            font: {
              size: 32,
            },
            z: 1,
          },
          beginAtZero: true,
        },
      },
      plugins: {
        tooltip: {
          enabled: false,
        },
        legend: {
          display: false,
        },
      },
    },
  });
} //initGraph

function updateGraph() {
  let label, data, c1, c2;

  label = SHAPES.results.map((a) => a.label);
  data = SHAPES.results.map((a) => a.data);
  c1 = SHAPES.results.map((a) => a.c1);
  c2 = SHAPES.results.map((a) => a.c2);

  let list = [];
  let total = 0;
  for (let j = 0; j < data.length; j++) {
    list.push({ data: data[j], label: label[j], c1: c1[j], c2: c2[j] });
  }
  for (let k = 0; k < list.length; k++) {
    data[k] = list[k].data;
    label[k] = `${list[k].label} - ${list[k].data} ${list[k].data == 1 ? "Vote" : "Votes"} (${Math.round((list[k].data / voters.length) * 100) || 0}%)`;
    c1[k] = list[k].c1;
    c2[k] = list[k].c2;
    total += list[k].data;
  }

  document.getElementById("totalvotesshapes").innerHTML = `Total votes: ${total}`;
  SHAPES.chart.data.labels = label;
  SHAPES.chart.data.datasets.forEach((dataset) => {
    dataset.data = data;
    dataset.backgroundColor = c1;
    dataset.borderColor = c2;
  });
  SHAPES.chart.update();
} //updateGraph

let SHAPES = {
  figureList: Array.from(document.querySelectorAll("#field div.figure")),
  optionList: Array.from(document.querySelectorAll("#variants div.figure")),
  startBtn: document.querySelector("#startshapesbtn"),
  dVariants: document.querySelector("#variants"),
  dResult: document.querySelector("#shapesgameResult"),
  dDifficulty: document.querySelector("select#difficulty"),
  lives: document.querySelector("#lives"),
  ctx: document.getElementById("shapeschartCanvas").getContext("2d"),
  chart: null,
  results: [
    { label: "1", data: 0, c1: "#f44336", c2: "#f53337" },
    { label: "2", data: 0, c1: "#f4c236", c2: "#f5c237" },
    { label: "3", data: 0, c1: "#a8f436", c2: "#a9e437" },
  ],
  shapesGame: {
    figs: [],
    choices: [],
    correct: -1,
    lives: 0,
    difficulty: 0,
    rule: null,
    gameStarted: false,
  },
}; //SHAPES

function drawShapes() {
  SHAPES.figureList.forEach((f, i) => {
    const fig = SHAPES.shapesGame.figs[i];
    f.classList = "figure";
    if (!fig) {
      f.classList = "figure unknown";
      if (i == SHAPES.shapesGame.figs.length) f.classList.add("next");
    } else {
      f.classList.add(fig.size ? "big" : "small");
      f.classList.add(fig.type ? "circle" : "square2");
      f.classList.add(fig.color ? "blue" : "red");
    }
  });
  if (!SHAPES.shapesGame.gameStarted) return;
  SHAPES.optionList.forEach((f, i) => {
    const fig = SHAPES.shapesGame.choices[i];
    f.classList = "figure option";
    f.classList.add(fig.size ? "big" : "small");
    f.classList.add(fig.type ? "circle" : "square2");
    f.classList.add(fig.color ? "blue" : "red");
    if (fig.isKnownToBeIncorrect()) f.classList.add("unpickable");
  });
  SHAPES.dVariants.style.visibility = "visible";
  SHAPES.lives.innerHTML = `Lives: ${"❤".repeat(parseInt(SHAPES.shapesGame.lives, 10))}`;
} //drawShapes

function generateChoices() {
  SHAPES.shapesGame.choices = new Array(3).fill(null);
  SHAPES.shapesGame.correct = Math.floor(Math.random() * SHAPES.shapesGame.choices.length);
  SHAPES.shapesGame.choices[SHAPES.shapesGame.correct] = SHAPES.shapesGame.rule.gen(SHAPES.shapesGame.figs[SHAPES.shapesGame.figs.length - 1]);
  for (let i = 0; i < SHAPES.shapesGame.choices.length; i++) {
    while (!SHAPES.shapesGame.choices[i]) {
      let f = SHAPES.shapesGame.rule.fake(SHAPES.shapesGame.figs[SHAPES.shapesGame.figs.length - 1]);
      if (SHAPES.shapesGame.choices.every((c) => !f.isEqual(c))) SHAPES.shapesGame.choices[i] = f; //jshint ignore:line
    }
  }
} //generateChoices

function endGame(win = false) {
  SHAPES.lives.innerHTML = `Lives: 💀`;

  SHAPES.shapesGame.gameStarted = false;
  document.querySelector("#endMessage").innerText = win ? "Congrats! You've filled the row!" : "YOU LOST! Wow, you are so bad at this game!";
  document.querySelector("#rule").innerText = SHAPES.shapesGame.rule.desc;
  SHAPES.dVariants.style.visibility = "hidden";
  SHAPES.dResult.style.visibility = "visible";
  SHAPES.startBtn.disabled = false;
  SHAPES.dDifficulty.disabled = false;
} //endGame

function makeChoice(event) {
  if (!SHAPES.shapesGame.gameStarted) return;
  try {
    if (event.target.classList.contains("unpickable")) return;
    const selected = parseInt(event.target.dataset.choice, 10);
    if (selected !== SHAPES.shapesGame.correct) {
      SHAPES.results = SHAPES.results.filter(function (el) {
        return parseInt(el.label, 10) != selected + 1;
      });
      updateGraph("shapes");
      SHAPES.shapesGame.lives -= 1;
      SHAPES.shapesGame.choices[selected].isKnownToBeIncorrect(true);
      showToast("Incorrect choice!", "danger", 3000);

      if (SHAPES.shapesGame.lives < 1) {
        endGame(false);
      }
    } else {
      SHAPES.results = [
        { label: "1", data: 0, c1: "#f44336", c2: "#f53337" },
        { label: "2", data: 0, c1: "#f4c236", c2: "#f5c237" },
        { label: "3", data: 0, c1: "#a8f436", c2: "#a9e437" },
      ];
      updateGraph("shapes");
      SHAPES.shapesGame.figs.push(SHAPES.shapesGame.choices[SHAPES.shapesGame.correct]);
      if (SHAPES.shapesGame.figs.length >= SHAPES.figureList.length) {
        endGame(true);
      } else {
        generateChoices();
      }
    }
    drawShapes();
  } catch (e) {
    console.warn(e);
    console.log("Event causing an error: ", event);
  }
} //makeChoice

function start() {
  SHAPES.dResult.style.visibility = "hidden";
  SHAPES.startBtn.disabled = true;
  SHAPES.dDifficulty.disabled = true;
  SHAPES.shapesGame.difficulty = parseInt(SHAPES.dDifficulty.value, 10) || 0;
  SHAPES.shapesGame.lives = 3 - SHAPES.shapesGame.difficulty;
  const rulePool = rules[Object.keys(rules)[SHAPES.shapesGame.difficulty]];
  SHAPES.shapesGame.rule = rulePool[Math.floor(Math.random() * rulePool.length)];
  SHAPES.shapesGame.figs.length = 0;
  SHAPES.shapesGame.figs.push(new Figure());
  for (let i = 1; i < 3; i++) {
    SHAPES.shapesGame.figs.push(SHAPES.shapesGame.rule.gen(SHAPES.shapesGame.figs[SHAPES.shapesGame.figs.length - 1]));
  }
  SHAPES.shapesGame.gameStarted = true;
  generateChoices();
  drawShapes();
  SHAPES.results = [
    { label: "1", data: 0, c1: "#f44336", c2: "#f53337" },
    { label: "2", data: 0, c1: "#f4c236", c2: "#f5c237" },
    { label: "3", data: 0, c1: "#a8f436", c2: "#a9e437" },
  ];
  updateGraph("shapes");
} //start

function reset() {
  SHAPES.dResult.style.visibility = "hidden";
  SHAPES.startBtn.disabled = false;
  SHAPES.dDifficulty.disabled = false;
  SHAPES.shapesGame = {
    figs: [],
    choices: [],
    correct: -1,
    lives: 0,
    difficulty: 0,
    rule: null,
    gameStarted: false,
  };
  SHAPES.results = [
    { label: "1", data: 0, c1: "#f44336", c2: "#f53337" },
    { label: "2", data: 0, c1: "#f4c236", c2: "#f5c237" },
    { label: "3", data: 0, c1: "#a8f436", c2: "#a9e437" },
  ];
} //reset

function playTurn() {
  let list = SHAPES.results;
  list.sort(function (a, b) {
    return a.data > b.data ? -1 : a.data == b.data ? 0 : 1;
  });

  SHAPES.optionList[parseInt(list[0].label, 10) - 1].click();
  voters = [];
  for (let index = 0; index < SHAPES.results.length; index++) {
    SHAPES.results[index].data = 0;
  }
  SHAPES.results.sort(function (a, b) {
    return parseInt(a.label, 10) < parseInt(b.label, 10) ? -1 : parseInt(a.label, 10) == parseInt(b.label, 10) ? 0 : 1;
  });
  updateGraph("shapes");
} //playTurn

function listeners() {
  document.getElementById("difficulty").onchange = function () {
    document.getElementById("lives").innerHTML = `Lives: ${"❤".repeat(3 - parseInt(this.value, 10))}`;
  };
  SHAPES.optionList.forEach((o) => o.addEventListener("click", makeChoice));

  document.getElementById("shapeslength").oninput = function () {
    document.getElementById("shapeslengthlabel").innerHTML = this.value;
  };
} //listeners

class Figure {
  constructor(isCircle, isBlue, isBig) {
    this.type = Boolean(isCircle === null ? Math.round(Math.random()) : isCircle);
    this.color = Boolean(isBlue === null ? Math.round(Math.random()) : isBlue);
    this.size = Boolean(isBig === null ? Math.round(Math.random()) : isBig);
  }

  isEqual(figure) {
    if (!figure) return false;
    return this.type === figure.type && this.color === figure.color && this.size === figure.size;
  }

  isKnownToBeIncorrect(set = false) {
    if (set) this.isBad = true;
    return this.isBad || false;
  }
}

const rules = {
  easy: [
    {
      desc: "Next figure must be of SAME COLOR as the last one",
      fake: (f) => new Figure(null, !f.color, null),
      gen: (f) => new Figure(null, f.color, null),
    },
    {
      desc: "Next figure must be of SAME SIZE as the last one",
      fake: (f) => new Figure(null, null, !f.size),
      gen: (f) => new Figure(null, null, f.size),
    },
    {
      desc: "Next figure must be of SAME SHAPE as the last one",
      fake: (f) => new Figure(!f.type, null, null),
      gen: (f) => new Figure(f.type, null, null),
    },
    {
      desc: "Next figure must be of DIFFERENT COLOR than the last one",
      fake: (f) => new Figure(null, f.color, null),
      gen: (f) => new Figure(null, !f.color, null),
    },
    {
      desc: "Next figure must be of DIFFERENT SIZE than the last one",
      fake: (f) => new Figure(null, null, f.size),
      gen: (f) => new Figure(null, null, !f.size),
    },
    {
      desc: "Next figure must be of DIFFERENT SHAPE than the last one",
      fake: (f) => new Figure(f.type, null, null),
      gen: (f) => new Figure(!f.type, null, null),
    },
  ],
  normal: [
    {
      desc: "If last shape was SMALL, next one has to be BLUE, otherwise - RED",
      fake: (f) => new Figure(null, f.size, null),
      gen: (f) => new Figure(null, !f.size, null),
    },
    {
      desc: "If last shape was BIG, next one has to be SQUARE, otherwise - CIRCLE",
      fake: (f) => new Figure(f.size, null, null),
      gen: (f) => new Figure(!f.size, null, null),
    },
    {
      desc: "If last shape was BLUE, next one has to be CIRCLE, otherwise - SQUARE",
      fake: (f) => new Figure(!f.color, null, null),
      gen: (f) => new Figure(f.color, null, null),
    },
    {
      desc: "If last shape was CIRCLE, next one has to be BIG, otherwise - SMALL",
      fake: (f) => new Figure(null, null, !f.type),
      gen: (f) => new Figure(null, null, f.type),
    },
    {
      desc: "If last shape was BLUE, next one has to be SMALL, otherwise - BIG",
      fake: (f) => new Figure(null, null, f.color),
      gen: (f) => new Figure(null, null, !f.color),
    },
    {
      desc: "If last shape was CIRCLE, next one has to be SMALL, otherwise - BIG",
      fake: (f) => new Figure(null, null, f.type),
      gen: (f) => new Figure(null, null, !f.type),
    },
  ],
  hard: [
    {
      desc: "If last shape was BIG, next one has to be BLUE, otherwise - of SAME TYPE as last shape",
      fake: (f) => new Figure(f.size ? null : !f.type, f.size ? false : null, null),
      gen: (f) => new Figure(f.size ? null : f.type, f.size ? true : null, null),
    },
    {
      desc: "If last shape was BIG, next one has to be BLUE, otherwise - of DIFFERENT COLOR than the last shape",
      fake: (f) => new Figure(null, f.size ? false : f.color, null),
      gen: (f) => new Figure(null, f.size ? true : !f.color, null),
    },
    {
      desc: "If last shape was BLUE, next one has to be BIG, otherwise - of DIFFERENT TYPE than the last shape",
      fake: (f) => new Figure(f.color ? null : f.type, null, f.color ? false : null),
      gen: (f) => new Figure(f.color ? null : !f.type, null, f.color ? true : null),
    },
    {
      desc: "If last shape was RED, next one has to be CIRCLE, otherwise - SMALL",
      fake: (f) => new Figure(f.color ? null : false, null, f.color ? true : null),
      gen: (f) => new Figure(f.color ? null : true, null, f.color ? false : null),
    },
  ],
};
