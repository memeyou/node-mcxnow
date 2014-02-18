var request = require("request")
    xml2js = require("xml2js"),
    async = require("async");

var mcxnow = function(user, pass, nonceInput) {
  var self = this;
  self.url = "https://mcxnow.com/";
  self.user = user;
  self.pass = pass;
  self.nonce = nonceInput;
  self.j = request.jar();
  self.key

  self.makeRequest = function(cmd, callback) {
    if(!self.user || !self.pass) {
      callback(new Error("Must provide a Username and Password to use the trade API."));
      return;
    }

    async.auto({
      getSession: function(callback) {
        request({ url: self.url + 'login.html', method: "POST", form: { user: self.user, pass: self.pass }, jar: self.j }, function(err, response, body) {
          if(err || response.statusCode !== 200)
            return callback(new Error(err ? err : response.statusCode));
            for(i = 0; i < self.j.cookies.length; i++) {
              if(self.j.cookies[i].name == 'mcx_key') {
                self.key = self.j.cookies[i].value;
              }
            }
          callback(null, body);
        });
      },
      
      getRequest: ['getSession', function(callback) {
      
        request({ url: self.url+cmd.replace('SESSIONKEY', self.key),
          method: "GET", jar: self.j }, function(err, response, body) {
          if(err || response.statusCode !== 200)
            return callback(new Error(err ? err : response.statusCode));
            
          if(!body) return true;

          try {
            xml2js.parseString(body, function (err, data) {
              callback(data.doc);
            });
          } catch(err) {
            return callback(err);
          }
        });
      }]
    }, function (results) { return callback(results); });
  };

  self.makePublicApiRequest = function(cmd, callback) {
    request({ url: self.url + cmd }, function(err, response, body) {
      if(err || response.statusCode !== 200) {
        return callback(new Error(err ? err : response.statusCode));
      }

      try {
        xml2js.parseString(body, function (err, data) {
          callback(err, data.doc);
        });
      } catch(err) {
        return callback(new Error(err));
      }
    });
  };

  self.cancelTrade = function(orderId, callback) {
    self.makeRequest('orders?cur=' + curr, callback);
  };
  
  self.trade = function(curr, amount, price, buy, callback) {
    self.makeRequest('action?trade&sk=SESSIONKEY&cur='
      + curr + '&buy=' + buy + '&amt=' + amount
      + '&price=' + price + '&enabled=1', callback);
  };

  self.dotest = function(request, callback) {
    self.makeRequest('info?cur='+request, callback);
  };
  
  self.getTicker = function(curr, callback) {
    self.orderbook(curr, function(err, data) {
      var ticker = {
        ask:  data.buy[0].o[0].p[0],
        bid:  data.sell[0].o[0].p[0]
      }
      callback(err, ticker);
    });
  };
  
  self.getHistory = function(curr, callback) {
    self.orderbook(curr, function(err, data) {
      var output = [];
      for(i = 0; i < data.history[0].o.length; i++) {
		output[i] = {
		date: data.history[0].o[i].t[0],
		price: data.history[0].o[i].p[0],
		amount: data.history[0].o[i].c1[0]
		};
      }
      callback(err, output.reverse());
    });
  };
  
  self.getOrders = function(curr, callback) {
    self.info(curr, function(data) {
      if(!data.orders[0].o) return callback(null, false);
      callback(data.orders[0].o);
    });
  };

  self.cancelOrder = function(curr, callback) {
    self.info(curr, function(data) {
      if(!data.orders[0].o) return callback(null, false);
      var id = data.orders[0].o[0].id;

      self.makeRequest('action?canceltrade'
        + '&sk=SESSIONKEY'
        + '&cur=' + curr
        + '&id=' + id, callback);
    });
  };
  
  self.info = function(curr, callback) {
    self.makeRequest('info?cur=' + curr, callback);
  };

  self.orderbook = function(curr, callback) {
    self.makePublicApiRequest('orders?cur=' + curr, callback);
  };
};

module.exports = mcxnow;
