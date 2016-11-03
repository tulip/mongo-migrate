module.exports = {
	getConnection: getConnection
};

function getDbOpts(opts) {
	opts = opts || {
		host: 'localhost',
		db: 'my-app',
		port: 27017
	};
	opts.port = opts.port || 27017;
	return opts;
}

function getReplicaSetServers(opts, mongodb){
    var replServers = opts.replicaSet.map(function(replicaSet){
      var split = replicaSet.split(":");
      var host  = split[0] || 'localhost';
      var port = parseInt(split[1]) || 27017;
      return new mongodb.Server(host, port);
    });
    var replSetOpts = {};
    if (opts.replicaSetName !== undefined ) {
      replSetOpts.replicaSet = opts.replicaSetName;
    }
    if (opts.ssl !== undefined) {
      replSetOpts.ssl = true;
    }
   return  new mongodb.ReplSet(replServers, replSetOpts);
}

function getConnection(opts, cb) {
    opts = getDbOpts(opts);
    var mongodb = require('mongodb');
    var svr = null;
  //if replicaSet option is set then use a replicaSet connection
  if (opts.replicaSet) {
    svr = getReplicaSetServers(opts, mongodb);
  } else {
    //simple connection
    svr = new mongodb.Server(opts.host, opts.port, {});
  }

  var connectOpts = {safe: true};
  if (opts.authSource != null ) {
    connectOpts.authSource = opts.authSource;
  }
  new mongodb.Db(opts.db, svr, connectOpts).open(function (err, db) {
		if (err) {
			return cb(err);
		}

    var complete = function(authErr, res) {
      if(authErr) {
        return cb(authErr);
      }


      if (typeof db.collection !== 'undefined') {
        // for mongodb 2.x
        var collection = db.collection('migrations');
      } else {
        var collection = new mongodb.Collection(db, 'migrations');
      }
      cb(null, {
        connection: db,
        migrationCollection: collection
      });
    };

    if(opts.username) {
      db.authenticate(opts.username, opts.password, opts.authOptions || {}, complete);
    } else {
      complete(null, null);
    }
	});
}
