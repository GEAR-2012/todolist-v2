const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const dotenv = require('dotenv').config();

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

main();

async function main() {
  try {
    const [Item, List] = await connect();

    app.listen(3000, function () {
      console.log("Server started on port 3000");
    });

    const item_1 = new Item({
      name: "Welcome to your todolist!",
    });
    const item_2 = new Item({
      name: "Hit the + button to add a new item.",
    });
    const item_3 = new Item({
      name: "<-- Hit this to delete an item.",
    });
    const defaultItems = [item_1, item_2, item_3];

    app.get("/", async function (req, res) {
      const foundItems = await Item.find().exec();
      if (foundItems.length === 0) {
        try {
          await Item.insertMany(defaultItems);
          console.log("Successfully saved default items to DB.");
          res.redirect("/");
        } catch (e) {
          console.error(e.message);
        }
      } else {
        res.render("list", { listTitle: "Yesterday", newListItems: foundItems });
      }
    });

    app.post("/", async function (req, res) {
      const itemName = req.body.newItem;
      const listName = req.body.list;
      const item = new Item({
        name: itemName,
      });
      try {
        if (listName === "Today") {
          await item.save();
          res.redirect("/");
        } else {
          const foundList = await List.findOne({ name: listName }).exec();
          foundList.items.push(item);
          await foundList.save();
          res.redirect(`/${listName}`);
        }
      } catch (e) {
        console.error(e.message);
      }
    });

    app.post("/delete", async function (req, res) {
      const checkedItemId = req.body.checkbox;
      const listName = req.body.listName;
      try {
        if (listName === "Today") {
          await Item.findByIdAndRemove(checkedItemId);
          res.redirect("/");
        } else {
          const filter = { name: listName };
          const update = { $pull: { items: { _id: checkedItemId } } };
          await List.findOneAndUpdate(filter, update).exec();
          res.redirect(`/${listName}`);
        }
        console.log(`Item successfully deleted with the id: '${checkedItemId}' from the '${listName}' list.`);
      } catch (e) {
        console.error(e.message);
      }
    });

    app.get("/:customListName", async function (req, res) {
      const customListName = _.capitalize(req.params.customListName);

      try {
        const foundList = await List.findOne({ name: customListName }).exec();
        if (!foundList) {
          // Create a new list
          const list = new List({
            name: customListName,
            items: defaultItems,
          });

          await list.save();
          res.redirect(`/${customListName}`);
        } else {
          // Show an existing list
          res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
        }
      } catch (e) {
        console.error(e.message);
      }
    });

    app.get("/about", function (req, res) {
      res.render("about");
    });
  } catch (e) {
    console.error(e.message);
  }
}

async function connect() {
  mongoose.set("strictQuery", false);

  const userName = process.env.USER_NAME;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;

  const uri = `mongodb+srv://${userName}:${dbPassword}@cluster0.i8f6e4b.mongodb.net/${dbName}?retryWrites=true&w=majority`;

  await mongoose.connect(uri);
  console.log("Connected to the todolistDB database");
  const itemSchema = { name: String };
  const Item = mongoose.model("Item", itemSchema);
  const listSchema = {
    name: String,
    items: [itemSchema],
  };
  const List = mongoose.model("List", listSchema);
  return [Item, List];
}
