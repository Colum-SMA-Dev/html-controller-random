'use strict';

var debug = require('debug')('html-controller-random');
var _ = require('lodash');
var TagMatcher = require('tag-matcher');
var EventEmitter = require('events').EventEmitter;
var timer = require('timer-shim');
var util = require('util');

module.exports = MediaObjectQueue;
util.inherits(MediaObjectQueue, EventEmitter);

var SCENE_PROP_DEFAULTS = {
    displayInterval: 3,
    displayDuration: 10,
    transitionDuration: 1.4
};

var queueCount = 0;

/* 
    defaultDisplayCounts - {typeName: num, typeName, num, ...}
*/
function MediaObjectQueue(defaultDisplayCounts) {
        // objects that are up for display
    var queue = [],
        // list of objects that are currently out on loan from the queue
        active = [],
        // all objects in the scene
        masterList = [],
        tagMatcher = new TagMatcher(),
        maximumOnScreen = {},
        // reference to the interval that triggers showing of media
        showTimeout,
        // array of string type names used in queue calculations
        types = [],
        // this referecence for private functions
        self = this; 

    this.queueCount = ++queueCount;

    function activeCount (typeName) {
        return _.filter(active, function(mo) { return mo.type === typeName; }).length;
    }

    this.setScene = function(newScene, ops) {
        ops = ops || {};

        // process scene attributes
        var sceneVal;
        _.forEach(SCENE_PROP_DEFAULTS, function(defaultVal, prop) {
            sceneVal = parseFloat(newScene[prop]);
            this[prop] = isNaN(sceneVal) ? defaultVal * 1000 : sceneVal * 1000;
        }.bind(this));

        // default type counts
        maximumOnScreen = _.reduce(defaultDisplayCounts, function(counts, defaultCount, type) {
            var count;
            try {
                count = parseInt(newScene.maximumOnScreen[type]);
            } catch (e) {
                if (e instanceof TypeError) {
                    // do nothing, this just means there is no specified maximumOnScreen object in the scene
                    // we just go with the default then
                } else {
                    throw e;
                }
            } finally {
                if (isNaN(count)){
                    count = defaultCount;
                }
                counts[type] = count;
                return counts;
            }
        }, {});

        // process the mediaObjects
        var newMo, 
            index,
            oldMo;

        masterList = _.clone(newScene.scene);

        // fill the queue with matching mediaObjects
        queue = _(masterList)
            .filter(function(mo) {
                return tagMatcher.match(mo.tags);
            })
            .shuffle()
            .value();

        // create an index of our types in the scene
        types = _(newScene.scene)
            .pluck('type')
            .uniq()
            .value();
    };

    function showNextMediaObject () {
        // use timeouts so that showNextMediaObject can be called internally whenever 
        // and it will handle rescheduling itself.
        if (showTimeout) {
            timer.clearTimeout(showTimeout);
        }

        if (self.displayInterval) {
            showTimeout = timer.setTimeout(showNextMediaObject, self.displayInterval);    
        }

        var activeSoloTypes = _(active)
            .filter(function(mo) {
                return mo.solo === true;
            })
            .map(function(mo) {
                return mo.type;
            }).value();

        var eligibleTypes = _(types)
            .filter(function(moType) {
                return activeCount(moType) < maximumOnScreen[moType];
            })
            .difference(activeSoloTypes).value();

        function checkType (obj) {
            return _.find(eligibleTypes, function(type) { 
                return queue[i].type === type; 
            });
        }

        if (eligibleTypes.length > 0) {
            var matchedType, matchedMo;

            for (var i = 0; i < queue.length; i++) {
                matchedType = checkType(queue[i]);

                if (matchedType) {
                    matchedMo = queue[i];

                    // if the next mo in the queue is marked as solo, only give it back once
                    // all other active mo's of the same type are off the stage
                    if (matchedMo.solo !== true || (matchedMo.solo === true && activeCount(matchedType) === 0)) {
                        queue.splice(i, 1);
                        active.push(matchedMo);
                        self.emit('show', {
                            mediaObject: matchedMo,
                            displayDuration: self.displayDuration,
                            transitionDuration: self.transitionDuration
                        });
                        // exit the loop after we found the first one
                        return;
                    }
                }    
            }     
        }
        // body...
    }

    this.play = function() {
        showNextMediaObject();
    };

    this.stop = function () {
        if (showTimeout) {
            timer.clearTimeout(showTimeout);    
        }
    };

    this.mediaTransitioning = function(moId) {
        // pull it out of the active list
        debug('mediaTransitioning called for ' + moId);
        var activeIndex = _.findIndex(active, function(activeMo) { return activeMo._id === moId; }); 
        active.splice(activeIndex, 1);

        showNextMediaObject();
    };

    this.mediaDone = function(moId) {
        debug('mediaDone called for ' + moId);
        // make sure it's still in the masterList
        var masterMo = _.find(masterList, function(m) { return m._id === moId; });
        // and make sure it's not in the queue.  This could happen if a Queue gets an identical
        // scene set once after another.
        var queueMo = _.find(queue, function(m) { return m._id === moId; });
        if (masterMo && ! queueMo) {
            // make sure it matches the current tagFilter
            if (tagMatcher.match(masterMo.tags)) {
                queue.push(masterMo);        
            }
        }
    };

    this.setTagMatcher = function(newTagMatcher) {
        if (! tagMatcher.equalTo(newTagMatcher)) {
            tagMatcher = newTagMatcher;

            // fill queue with all newly matching mos from masterList that aren't currently playing
            queue = _(masterList)
                .filter(function(mo) {
                    return tagMatcher.match(mo.tags);
                })
                .difference(active)
                .shuffle()
                .value();

            // transition out currently playin non-matching media objects
            _(active)
                .filter(function(mo) {
                    return ! tagMatcher.match(mo.tags);
                }).each(function(mo) {
                    self.emit('transition', mo);
                }).value();
        }
    };
}