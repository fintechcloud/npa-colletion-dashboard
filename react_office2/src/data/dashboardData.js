// TEMPORARY sample data for frontend development.
// Each case: [agentIdx, leaderIdx, typeIdx, statusIdx, dayOffset, dueAmt, recvdAmt]

export const CASES = [
  [0, 0, 0, 0, 0, 50000, 50000],
  [0, 0, 1, 1, 1, 30000, 28000],
  [0, 0, 0, 4, 2, 45000, 0],
  [1, 0, 1, 0, 0, 60000, 60000],
  [1, 0, 0, 3, 1, 20000, 9000],
  [2, 1, 0, 0, 0, 35000, 35000],
  [2, 1, 1, 2, 2, 15000, 6000],
  [3, 1, 0, 1, 1, 40000, 39000],
  [3, 1, 1, 4, 2, 25000, 0],
  [4, 2, 0, 0, 0, 55000, 55000],
];

export const META = {
  agents: ["Ravi Kumar", "Priya Sharma", "Arun Rana", "Neha Singh", "Sunil Yadav"],
  leaders: ["CHINTU SHARMA", "VIJAY SHARMA", "SUNIL KUMAR"],
  statuses: ["CLOSED", "PRE-CLOSED", "SETTLED", "PART-PAYMENT", "DISBURSED"],
  types: ["NEW", "REPEAT"],
  agentPrimaryLeader: {
    "Ravi Kumar": "CHINTU SHARMA",
    "Priya Sharma": "CHINTU SHARMA",
    "Arun Rana": "VIJAY SHARMA",
    "Neha Singh": "VIJAY SHARMA",
    "Sunil Yadav": "SUNIL KUMAR"
  },
  agentMultiLeaders: {},
  dateMin: "2026-08-01",
  dateMax: "2026-08-03"
};