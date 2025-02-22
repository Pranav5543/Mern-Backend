import axios from "axios";
import Transaction from "../models/Transaction.js";

// ✅ Fetch and Store Data from Third-Party API
export const fetchAndStoreData = async (req, res) => {
  try {
    const count = await Transaction.countDocuments();
    if (count > 0) {
      return res.status(200).json({ message: "Data already exists in the database." });
    }

    const response = await axios.get(process.env.THIRD_PARTY_API);
    const transactions = response.data;

    await Transaction.deleteMany(); // Clear old data
    await Transaction.insertMany(transactions); // Store new data

    res.status(200).json({ message: "Database initialized successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
};

// ✅ List Transactions (Search & Pagination)
export const listTransactions = async (req, res) => {
  try {
    const { month, search, page = 1, perPage = 10 } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    // Filter by month regardless of the year
    const monthNumber = new Date(`${month} 1, 2024`).getMonth() + 1;
    let query = { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { price: { $eq: parseFloat(search) || 0 } }, // Add price to search
      ];
    }

    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(Number(perPage));

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions", error });
  }
};

// ✅ Get Statistics API
export const getStatistics = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const monthNumber = new Date(`${month} 1, 2024`).getMonth() + 1;

    const totalSales = await Transaction.aggregate([
      { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] }, sold: true } },
      { $group: { _id: null, totalAmount: { $sum: "$price" }, totalSold: { $sum: 1 } } },
    ]);

    const totalNotSold = await Transaction.countDocuments({
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      sold: false,
    });

    res.status(200).json({
      totalSalesAmount: totalSales[0]?.totalAmount || 0,
      totalSoldItems: totalSales[0]?.totalSold || 0,
      totalNotSoldItems: totalNotSold,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching statistics", error });
  }
};

// ✅ Get Bar Chart Data
export const getBarChartData = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const monthNumber = new Date(`${month} 1, 2024`).getMonth() + 1;

    const priceRanges = [
      { range: "0-100", min: 0, max: 100 },
      { range: "101-200", min: 101, max: 200 },
      { range: "201-300", min: 201, max: 300 },
      { range: "301-400", min: 301, max: 400 },
      { range: "401-500", min: 401, max: 500 },
      { range: "501-600", min: 501, max: 600 },
      { range: "601-700", min: 601, max: 700 },
      { range: "701-800", min: 701, max: 800 },
      { range: "801-900", min: 801, max: 900 },
      { range: "901-above", min: 901, max: Infinity },
    ];

    const barChartData = await Promise.all(
      priceRanges.map(async ({ range, min, max }) => {
        const count = await Transaction.countDocuments({
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
          price: { $gte: min, $lte: max },
        });
        return { range, count };
      })
    );

    res.status(200).json(barChartData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bar chart data", error });
  }
};

// ✅ Get Pie Chart Data
export const getPieChartData = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const monthNumber = new Date(`${month} 1, 2024`).getMonth() + 1;

    const pieChartData = await Transaction.aggregate([
      { $match: { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.status(200).json(pieChartData);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pie chart data", error });
  }
};

// ✅ Combined API
export const getCombinedData = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const [statistics, barChartData, pieChartData] = await Promise.all([
      axios.get(`http://localhost:5000/api/statistics?month=${month}`),
      axios.get(`http://localhost:5000/api/barchart?month=${month}`),
      axios.get(`http://localhost:5000/api/piechart?month=${month}`),
    ]);

    res.status(200).json({
      statistics: statistics.data,
      barChartData: barChartData.data,
      pieChartData: pieChartData.data,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching combined data", error });
  }
};