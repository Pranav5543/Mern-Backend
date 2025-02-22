import express from "express";
import {
  fetchAndStoreData,
  listTransactions,
  getStatistics,
  getBarChartData,
  getPieChartData,
  getCombinedData,
} from "../controllers/dataController.js";

const router = express.Router();

router.get("/initialize", fetchAndStoreData);
router.get("/transactions", listTransactions);
router.get("/statistics", getStatistics);
router.get("/barchart", getBarChartData);
router.get("/piechart", getPieChartData);
router.get("/combined", getCombinedData);

export default router;