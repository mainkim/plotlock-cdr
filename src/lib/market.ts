import type { StoryMarket } from "../types";

export const defaultMarket: StoryMarket = {
  id: "cyber-academy-ep8-traitor",
  ipAssetName: "Cyber Academy Episode 8",
  ipAssetId: "ip:story-aeneid-demo-cyber-academy-ep8",
  title: "Who is the traitor in Episode 8?",
  question: "The creator will reveal the traitor after Episode 8 is released. Predict before the reveal without seeing the crowd.",
  options: ["Rina", "Joon", "Mira", "No traitor"],
  deadlineLabel: "Demo deadline: closes when the creator clicks Resolve",
  prizePoolLabel: "230 test IP / points pool",
  status: "open"
};

export const demoWallets = [
  "0xFAN0000000000000000000000000000000000001",
  "0xFAN0000000000000000000000000000000000002",
  "0xFAN0000000000000000000000000000000000003"
];
