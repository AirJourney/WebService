'use strict';
function getTokenInfo(jwt, auth, secret) {
  // 判断请求头是否包含token
  if (
    auth.authorization &&
      auth.authorization.split(' ')[0] === 'Bearer'
  ) {
    const token = auth.authorization.split(' ')[1];
    let decode = '';
    if (token) {
      decode = jwt.verify(token, secret);
    }
    return decode;
  }
  return;
}
/**
 * 随机选取一个缓存服务器
 */
function getRandomCacheMachine() {
  const machineList = [ '47.100.223.126', '47.100.210.203', '47.100.211.174' ];
  const index = Math.floor(Math.random() * machineList.length);
  return machineList[index];
}

/**
 * 时间加法，对象原地替换
 * @param {{h:number,m:number}} start
 * @param {{h:number,m:number}} delta
 */
const addTime = (start, delta) => {
  let h = start.h + delta.h;
  let m = start.m + delta.m;
  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  start.h = h;
  start.m = m;
};


module.exports = {
  getTokenInfo,
  getRandomCacheMachine,
  addTime,
};
