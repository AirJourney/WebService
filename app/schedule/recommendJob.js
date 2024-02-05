const Subscription = require("egg").Subscription;
const moment = require("moment");
const fs = require("fs");
var path = require("path");

class RecommendWatcher extends Subscription {
  static get schedule() {
    return {
      cron: "0 0 */2 * * *",
      type: "all",
      disable: false,
      immediate: true,
    };
  }
  async subscribe() {
    const { ctx, app } = this;

    let owList = await app.redis.get("db0").keys("*");
    // let rtList = await app.redis.get("db1").keys('*');

    const recommendList = new Set();
    const depList = ["TPE", "KUL", "SIN", "SHA"];
    owList.forEach((ow) => {
      depList.forEach((dep) => {
        if (ow.indexOf(dep) > -1 && recommendList.size < 10) {
          recommendList.add(ow);
        }
      });
    });
    // owList = owList.splice(0,10)
    // rtList = rtList.splice(0,2)

    const redisKeyList = Array.from(recommendList); //owList.concat(rtList);
    fs.writeFile(
      path.join(__dirname, "../data/recommendCache.json"),
      JSON.stringify(redisKeyList),
      function (err) {
        if (err) {
          console.error(err);
        } else {
          console.log(redisKeyList);
        }
      }
    );
  }
}

module.exports = RecommendWatcher;
