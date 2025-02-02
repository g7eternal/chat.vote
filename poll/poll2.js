let myChart;
let barChart = true;
let pieChart = false;
let captchaModal, reportModal;
let token;
let cooldown = false;
let sorted = false;
let unsortedData = {};
let darkTheme = true;

let elements = {
  captchaModal: document.getElementById("captchaModal"),
  reportModal: document.getElementById("reportModal"),
  reason: document.getElementById("reason"),
  reportDetails: document.getElementById("reportDetails"),
  reportContact: document.getElementById("reportContact"),
  report: document.getElementById("report"),
  toastContainer: document.getElementById("toastContainer"),
  vote: document.getElementById("vote"),
  unblur: document.getElementById("unblur"),
  mainrow: document.getElementById("mainrow"),
  darkTheme: document.getElementById("darkTheme"),
};

const ckey = "6LdzxrwdAAAAADyHX2t8ZS4U5QxTNLVWNrGOeNp0";

function showCountdown(endtime) {
  document.getElementById("countdowndiv").innerHTML = `
    <div class="card border-danger" id="countdown">
    <div class="card-body" style="padding: 0px">
    <div class="values" style="font-size: 3em;"></div>
    </div>
    </div>`;

  let timer = new easytimer.Timer();
  timer.start({ countdown: true, startValues: { seconds: parseInt(endtime, 10) - Date.now() / 1000 } });
  document.querySelector("#countdown .values").innerHTML = "Poll closes in " + timer.getTimeValues().toString();
  timer.addEventListener("secondsUpdated", function (e) {
    document.querySelector("#countdown .values").innerHTML = "Poll closes in " + timer.getTimeValues().toString();
  });
  timer.addEventListener("targetAchieved", function (e) {
    document.querySelector("#countdown .values").innerHTML = "Poll closed";
    if (elements.vote) {
      elements.vote.disabled = true;
    }
  });
  if (parseInt(endtime, 10) - Date.now() / 1000 < 0) {
    document.querySelector("#countdown .values").innerHTML = "Poll closed";
    if (elements.vote) {
      elements.vote.disabled = true;
    }
  }
} //showCountdown

function unblur() {
  if (elements.unblur.innerHTML == '<i class="material-icons notranslate">visibility</i>Show images') {
    elements.unblur.innerHTML = '<i class="material-icons notranslate">visibility_off</i>Hide images';
    let images = document.querySelectorAll(".blur");
    for (let index = 0, j = images.length; index < j; index++) {
      images[index].className = "noblur";
    }
  } else {
    elements.unblur.innerHTML = '<i class="material-icons notranslate">visibility</i>Show images';
    let images = document.querySelectorAll(".noblur");
    for (let index = 0, j = images.length; index < j; index++) {
      images[index].className = "blur";
    }
  }
} //unblur

async function report(id) {
  let reason = parseInt(elements.reason.value, 10);
  if (!reason) {
    showToast("You need to select a reason", "warning", 2000);
    return;
  }
  let reportDetails = elements.reportDetails.value;
  let reportContact = elements.reportContact.value;
  elements.report.disabled = true;
  elements.report.innerHTML = spinner;

  try {
    token = await grecaptcha.execute(ckey, { action: "submit" });
    if (!token) {
      reportModal.hide();
      captchaModal.show();
      elements.report.disabled = false;
      elements.report.innerHTML = "Submit report";
      return;
    }
    let requestOptions = {
      method: "POST",
      headers: {},
      redirect: "follow",
      "Content-Type": "application/json",
      body: JSON.stringify({
        id: id,
        reason: reason,
        reportDetails: reportDetails,
        reportContact: reportContact,
        captchatoken: token,
      }),
    };
    let response = await fetch(`https://polls.pepega.workers.dev/report`, requestOptions);
    //let response = await fetch(`http://127.0.0.1:8787/report`, requestOptions);

    let result = await response.json();
    if (result.status != 200) {
      showToast(result.message, "warning", 5000);
      reportModal.hide();
      elements.report.disabled = false;
      elements.report.innerHTML = "Submit report";
      return;
    }
    showToast(result.message, "info", 3000);
    reportModal.hide();
    elements.report.disabled = false;
    elements.report.innerHTML = "Submit report";
  } catch (error) {
    elements.report.disabled = false;
    elements.report.innerHTML = "Submit report";
    if (!token) {
      reportModal.hide();
      captchaModal.show();
      return;
    }
    console.log(error);
  }
} //report

async function vote() {
  let vote = [];
  let options = document.querySelectorAll(".polloption");
  let type = options[0].type;
  let currecturl = new URL(window.location.href);
  let path = currecturl.pathname.slice(1).split("/");
  let pollID = path[0];
  if (type == "radio") {
    for (let i = 0, j = options.length; i < j; i++) {
      if (options[i].checked) {
        vote.push(options[i].value);
        break;
      }
    }
  } else if (type == "checkbox") {
    for (let i = 0, j = options.length; i < j; i++) {
      if (options[i].checked) {
        vote.push(options[i].value);
      }
    }
  }
  if (vote.length == 0) {
    return;
  }

  try {
    token = await grecaptcha.execute(ckey, { action: "submit" });
    if (!token) {
      captchaModal.show();
      return;
    }
    let requestOptions = {
      method: "POST",
      headers: {},
      redirect: "follow",
      "Content-Type": "application/json",
      body: JSON.stringify({
        id: pollID,
        vote: vote,
        captchatoken: token,
      }),
    };
    let response = await fetch(`https://polls.pepega.workers.dev/vote`, requestOptions);
    //let response = await fetch(`http://127.0.0.1:8787/vote`, requestOptions);

    let result = await response.json();
    if (result.status != 200) {
      showToast(result.message, "warning", 5000);
      return;
    }
    unsortedData = structuredClone(result.data);

    let total = 0;
    if (result.data.scores) {
      total = result.data.scores.reduce((a, b) => a + b, 0) || 0;
    }
    elements.mainrow.innerHTML = `
    <div class="col-xl-2"></div>
    <div class="col-xl-8">
      <div class="card bg-dark-subtle">
        <div class="card-body">
          <div id="countdowndiv"></div>
          ${result.data.title == "Untitled poll" ? "" : "<h1 class='display-5'>" + validator.escape(result.data.title) + "</h1>"}
          <div id="chartdiv" class="chart-container">
            <canvas id="chartCanvas"></canvas>
          </div>
          <div class="container">
            <div class="row mt-3">
              <div class="col">
                <div class="btn-group" role="group" aria-label="chart type toggles">
                  <input class="btn-check" type="radio" name="charttype" id="barChart" autocomplete="off" checked />
                  <label class="btn btn-outline-info" for="barChart" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="Bar chart">
                    <i style="transform: rotateZ(90deg)" class="material-icons notranslate">stacked_bar_chart</i>
                  </label>
                  <input class="btn-check" type="radio" name="charttype" id="pieChart" autocomplete="off" />
                  <label class="btn btn-outline-info" for="pieChart" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="Pie chart">
                    <i class="material-icons notranslate">pie_chart</i>
                  </label>
                  </div>
                  <input type="checkbox" class="btn-check" id="sortChart" autocomplete="off" ${sorted ? "checked" : ""}/>
                  <label class="btn btn-outline-success" for="sortChart" id="sortChartLabel" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="${
                    sorted ? "Unsort chart" : "Sort chart"
                  }"
                    ><i class="material-icons notranslate">sort</i>
                  </label>
                  <div class="totalVotesDiv">Total votes: <span id="totalVotes">${total}</span></div>
              </div>
              <div class="col">
              <button type="button" onclick="refresh()" class="float-end btn btn-info" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="Refresh score">
              <i class="material-icons notranslate">refresh</i>
              </button>
              <button type="button" id="backToPoll" onclick="backToPoll()" class="float-end btn btn-secondary" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="Back to poll">
              <i class="material-icons notranslate">arrow_back</i>
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-2"></div>`;
    if (result.data.endtime && parseInt(result.data.endtime, 10) - Date.now() / 1000 > 0) {
      showCountdown(result.data.endtime);
    }
    if (result.data.options) {
      loadChart(result.data.options, result.data.scores, result.data.colors);
    }
    document.getElementById("barChart").onchange = function () {
      barChart = this.checked;
      pieChart = !this.checked;
      loadChart(result.data.options, result.data.scores, result.data.colors);
    };
    document.getElementById("pieChart").onchange = function () {
      pieChart = this.checked;
      barChart = !this.checked;
      loadChart(result.data.options, result.data.scores, result.data.colors);
    };
    document.getElementById("sortChart").addEventListener(
      "click",
      function () {
        sorted = this.checked;
        const tooltip = bootstrap.Tooltip.getInstance("#sortChartLabel");
        tooltip.setContent({ ".tooltip-inner": this.checked ? "Unsort chart" : "Sort chart" });
        loadChart(result.data.options, result.data.scores, result.data.colors);
      },
      false
    );
    showToast(result.message, "primary", 5000);
  } catch (error) {
    if (!token) {
      captchaModal.show();
      return;
    }
    console.log(error);
  }
  enableTooltips();
  linkifyElementID("mainrow", true);
} //vote

async function refresh() {
  if (cooldown) {
    return;
  }
  cooldown = true;
  setTimeout(() => {
    cooldown = false;
  }, 5000);

  try {
    let currecturl = new URL(window.location.href);
    let path = currecturl.pathname.slice(1).split("/");
    let pollID = path[0];
    token = await grecaptcha.execute(ckey, { action: "submit" });
    if (!token) {
      captchaModal.show();
      return;
    }
    let requestOptions = {
      method: "GET",
      headers: {},
      redirect: "follow",
      "Content-Type": "application/json",
    };
    let url = `id=${encodeURI(pollID)}&captchatoken=${token}`;
    let response = await fetch(`https://polls.pepega.workers.dev/results/?${url}`, requestOptions);
    //let response = await fetch(`http://127.0.0.1:8787/results/?${url}`, requestOptions);

    let result = await response.json();
    unsortedData = structuredClone(result.data);

    let total = 0;
    if (result.data.votes) {
      total = result.data.votes || 0;
    } else if (result.data.scores) {
      total = result.data.scores.reduce((a, b) => a + b, 0) || 0;
    }
    elements.mainrow.innerHTML = `
    <div class="col-xl-2"></div>
    <div class="col-xl-8">
      <div class="card bg-dark-subtle">
        <div class="card-body">
          <div id="countdowndiv"></div>
          ${result.data.title == "Untitled poll" ? "" : "<h1 class='display-5'>" + validator.escape(result.data.title) + "</h1>"}
          <div id="chartdiv" class="chart-container">
            <canvas id="chartCanvas"></canvas>
          </div>
          <div class="container">
            <div class="row mt-3">
              <div class="col">
                <div class="btn-group" role="group" aria-label="chart type toggles">
                  <input class="btn-check" type="radio" name="charttype" id="barChart" autocomplete="off" checked />
                  <label class="btn btn-outline-info" for="barChart" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="Bar chart">
                    <i style="transform: rotateZ(90deg)" class="material-icons notranslate">stacked_bar_chart</i>
                  </label>
                  <input class="btn-check" type="radio" name="charttype" id="pieChart" autocomplete="off" />
                  <label class="btn btn-outline-info" for="pieChart" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="Pie chart">
                    <i class="material-icons notranslate">pie_chart</i>
                  </label>
                  </div>
                  <input type="checkbox" class="btn-check" id="sortChart" autocomplete="off" ${sorted ? "checked" : ""}/>
                  <label class="btn btn-outline-success" for="sortChart" id="sortChartLabel" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="${
                    sorted ? "Unsort chart" : "Sort chart"
                  }"
                    ><i class="material-icons notranslate">sort</i>
                  </label>
                  <div class="totalVotesDiv">Total votes: <span id="totalVotes">${total}</span></div>
              </div>
              <div class="col">
              <button type="button" onclick="refresh()" class="float-end btn btn-info" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="Refresh score">
              <i class="material-icons notranslate">refresh</i>
              </button>
              <button type="button" id="backToPoll" onclick="backToPoll()" class="float-end btn btn-secondary" data-bs-toggle="tooltip" data-bs-delay="200" data-bs-placement="top" data-bs-title="Back to poll">
              <i class="material-icons notranslate">arrow_back</i>
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-xl-2"></div>`;
    if (result.data.endtime && parseInt(result.data.endtime, 10) - Date.now() / 1000 > 0) {
      showCountdown(result.data.endtime);
    }
    if (result.data.options) {
      loadChart(result.data.options, result.data.scores, result.data.colors);
    }
    document.getElementById("barChart").onchange = function () {
      barChart = this.checked;
      pieChart = !this.checked;
      loadChart(result.data.options, result.data.scores, result.data.colors);
    };
    document.getElementById("pieChart").onchange = function () {
      pieChart = this.checked;
      barChart = !this.checked;
      loadChart(result.data.options, result.data.scores, result.data.colors);
    };
    document.getElementById("sortChart").addEventListener(
      "click",
      function () {
        sorted = this.checked;
        const tooltip = bootstrap.Tooltip.getInstance("#sortChartLabel");
        tooltip.setContent({ ".tooltip-inner": this.checked ? "Unsort chart" : "Sort chart" });
        loadChart(result.data.options, result.data.scores, result.data.colors);
      },
      false
    );
    showToast(result.message, "primary", 5000);
  } catch (error) {
    if (!token) {
      captchaModal.show();
      return;
    }
    console.log(error);
  }
  enableTooltips();
  linkifyElementID("mainrow", true);
} //refresh

function loadChart(options, scores, colors) {
  let ctx = document.getElementById("chartCanvas").getContext("2d");
  if (sorted) {
    let list = [];
    for (let i = 0, j = options.length; i < j; i++) list.push({ options: options[i], scores: scores[i], colors: colors[i] });
    list.sort(function (a, b) {
      return a.scores > b.scores ? -1 : a.scores == b.scores ? 0 : 1;
    });
    for (let i = 0, j = options.length; i < j; i++) {
      options[i] = list[i].options;
      scores[i] = list[i].scores;
      colors[i] = list[i].colors;
    }
  } else {
    options = unsortedData.options;
    scores = unsortedData.scores;
    colors = unsortedData.colors;
  }

  let total = 0;
  if (scores) {
    total = scores.reduce((a, b) => a + b, 0) || 0;
  }
  let label = [];
  if (!scores) {
    scores = [];
  }
  for (let index = 0, j = options.length; index < j; index++) {
    let score = !scores[index] ? 0 : scores[index];
    label[index] = `${options[index]} - ${score} ${score == 1 ? "Vote" : "Votes"} (${Math.round((scores[index] / total) * 100) || 0}%)`;
  }
  let c1 = colors.map((a) => `rgba(${a[0]},${a[1]},${a[2]},0.6)`);
  let c2 = colors.map((a) => `rgba(${a[0]},${a[1]},${a[2]},0.9)`);
  if (myChart) {
    myChart.destroy();
  }
  if (barChart) {
    myChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: label,
        datasets: [
          {
            label: "Score",
            data: scores,
            borderWidth: 2,
            backgroundColor: c1,
            borderColor: c2,
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
              font: function (context) {
                let count = options.length;
                let height = context.chart.height;
                let size = Math.round(height / 14) - count * 1.5;
                return {
                  size: size,
                };
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
  } else if (pieChart) {
    myChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: label,
        datasets: [
          {
            label: "Score",
            data: scores,
            borderWidth: 2,
            backgroundColor: c1,
            borderColor: c2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "right",
            onClick: null,
            labels: {
              color: "white",
              font: function (context) {
                let count = options.length;
                let size = Math.max(30 - count, 15);
                return {
                  size: size,
                };
              },
            },
          },
        },
      },
    });
  }
} //loadChart

function loadResults() {
  window.location.hash = "results";
  refresh();
} //loadResults

function backToPoll() {
  let currentUrl = window.location.href;
  currentUrl = currentUrl.replace(/#.*$/, "");
  window.location.href = currentUrl;
} //backToPoll

function switchTheme(checkbox) {
  document.documentElement.setAttribute("data-bs-theme", checkbox ? "dark" : "light");
  document.getElementById("twitchLogo").style.filter = `invert(${checkbox ? 0.25 : 0.65})`;
} //switchTheme

window.onload = function () {
  darkTheme = (localStorage.getItem("darkTheme") || "true") === "true";
  elements.darkTheme.checked = darkTheme ?? true;
  switchTheme(elements.darkTheme.checked);

  captchaModal = new bootstrap.Modal(elements.captchaModal);
  reportModal = new bootstrap.Modal(elements.reportModal);

  enableTooltips();

  let timestamp = document.getElementById("countdowndiv").getAttribute("name");
  if (timestamp != "null") {
    showCountdown(timestamp);
  }

  let options = document.querySelectorAll(".pollText");
  for (let index = 0, j = options.length; index < j; index++) {
    const doc = new DOMParser().parseFromString(options[index].innerHTML, "text/html");
    options[index].innerHTML = doc.documentElement.textContent;
  }

  let input = location.hash.replace("#", "").toLowerCase().trim();
  if (input == "r" || input == "result" || input == "results") {
    refresh();
  }
  linkifyElementID("mainrow", true);

  elements.darkTheme.onchange = function () {
    switchTheme(this.checked);
    darkTheme = elements.darkTheme.checked ?? true;
    localStorage.setItem("darkTheme", darkTheme);
  };
}; //onload
