function load_script(url) {
	var jq = document.createElement("script");
	jq.src = url;
	document.getElementsByTagName("body")[0].appendChild(jq);
}

function load_css(url) {
	var css = document.createElement("link");
	css.rel = "stylesheet";
	css.type = "text/css";
	css.href = url;
	document.getElementsByTagName("head")[0].appendChild(css);
}

function Page() {
  
  this.isLocalhost = function() {
    return window.location.hostname === 'localhost';
  };
  
	this.isSvtplay = function() {
		return window.location.hostname === "www.svtplay.se";
	};

	this.goToSvtplay = function() {
		window.location = "http://www.svtplay.se";
	};

	this.getVideoInfo = function() {
		var title = document.title.split(' | SVT Play')[0];
		var url = window.location.href + '?type=embed';
		return {'title': title, 'url': url};
	};
}

function Playlist() {
	this.store = function(playList) {
		localStorage.setItem("svtplaylist", JSON.stringify(playList));
	};

	this.add = function(videoInfo) {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
			if(playList[i].url === videoInfo.url) {
				return false; //already stored
			}
		}
		playList.push(videoInfo);
		this.store(playList);
		return playList;
	};

	this.remove = function(url) {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
			if(playList[i].url === url) {
				playList.splice(i,1);
				this.store(playList);
				return;
			}
		}
	};

	this.move = function(url, toIndex) {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
			if(playList[i].url === url && i < playList.length - 1) {
				var entry = playList[i];
				playList.splice(i,1);
				playList.splice(toIndex,0, entry);
				this.store(playList);
				return;
			}
		}
	};

	this.get = function() {
		var playlist = JSON.parse(localStorage.getItem("svtplaylist"));
		if(playlist) {
			return playlist;
		} else {
			return [];
		}
	};

	this.hasVideo = function(url) {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
			if(playList[i].url === url) {
				return true;
			}
		}
		return false;
	};
	
	this.removeExpiredVideos = function() {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
		  this.removeIfExpired(playList[i].url);
		}
	};
	
	this.removeIfExpired = function(url) {
	  var self = this;
	  $.ajax({
	    url: url,
      statusCode: {
          404: function() {
            self.remove(url);
          }
        }
    });		
	};
}

function Overlay(playlist, page) {
	this.overlay = $('<div id="playlistOverlay"></div>' );
	this.player = undefined;
	this.playlist = playlist;
	this.addButton = undefined;
	this.isEditing = false;

	this.show = function() {
		var self = this;
		
		var closeButton = $('<button id="playlistCloseButton" class="playlistButton">stäng</button>');
		closeButton.click(function() {
			self.hide();
		});
		this.overlay.append(closeButton);

		var menu = $('<div id="playlistMenu"><h2>SVT Playlist</h2></div>');
		var editButton = $('<button id="playlistEditButton" class="playlistButton">ändra</button>');
		editButton.click(function() {
			if(editButton.text() === 'ändra') {
  			self.editMode(true);
  			$('.playlistRemoveButton').show();
  			editButton.text('klar');
			} else {
  			self.editMode(false);
  			$('.playlistRemoveButton').hide();
  			editButton.text('ändra');
			}
		});
		var videoList = $('<ol id="playlistVideos"></ol>');
		this.loadVideoList(videoList);
		if(videoList.find('li').size() > 0) {
  		menu.append(editButton);
		} else {
		  menu.append('<p class="playlistEmptyMessage">Din spellista är tom.<p>');
		}
		menu.append(videoList);
		

		if($('#player').size() > 0 && !this.playlist.hasVideo(page.getVideoInfo().url)) {
			this.addButton = $('<button id="playlistAddButton" class="playlistButton"><span class="playIcon playIcon-Plus"></span> Lägg till den här videon </button>');
			this.addButton.click(function() {
				var videoInfo = page.getVideoInfo();
				if(playlist.add(videoInfo)) {
					self.addVideoToList(videoInfo, videoList);
					self.addButton.hide();
				}
				$('.playlistEmptyMessage').remove();
			});
			menu.append(this.addButton);
		}
		this.overlay.append(menu);
		this.player = $('<div id="playlistPlayer"></div>');
		this.player.hide();
		this.overlay.append(this.player);
		this.overlay.css({left: '-500px'});
		$(document.body).prepend(this.overlay);
		this.overlay.animate({'left': 0}, 500);
	};

	this.hide = function() {
		if(this.player) {
			this.player.remove();
		}
		this.overlay.animate({'left': -500}, 300, function() {
			$(this).remove();
		});
	};
	
	this.showMessage = function(message) {
	  this.overlay.append('<p class="playlistMessage">' + message + '</p>');
	  this.overlay.css({left: '-500px'});
		$(document.body).append(this.overlay);
		this.overlay.animate({'left': 0}, 500);
	};
	
	this.editMode = function(on) {
	  var self = this;
	  self.isEditing = on;
    if(on) {
      $('#playlistVideos').sortable({
      	axis: 'y',
      	update: function(event, ui) {
      		self.playlist.move(ui.item.attr('data-url'), ui.item.index());
      	}
      });
      $('#playlistVideos .playlistPlayButton').addClass('playlistArrows');
    } else {
      $('#playlistVideos').sortable('destroy');
      $('#playlistVideos .playlistPlayButton').removeClass('playlistArrows');
    }
	};

	this.loadPlayer = function(videoUrl) {
	  var self = this;
	  unsubscribe('/player/onVideoEnd', self.playNext);
		this.player.empty().load(videoUrl + ' .svtFullFrame', function() {
			$('.svtplayer').each(function(){
				if(!$(this).hasClass('svtplayerInitialized')){
					new svtplayer.SVTPlayer($(this));
					subscribe('/player/onVideoEnd', self.playNext);
				}
			});
		});
		this.player.show();
	};
	
	this.playNext = function() {
		var next = $('.playlistActiveVideo').parent().next();
		if(next.size() > 0) {
			next.find('.playlistPlayButton').click();
		}
	};

	this.loadVideoList = function(videoList) {
		var videoInfoList = this.playlist.get();
		for(var i=0; i < videoInfoList.length; i++) {
			this.addVideoToList(videoInfoList[i], videoList);
		}
	};

	this.addVideoToList = function(videoInfo, videoList) {
		var self = this;
		var video = $('<li class="playlistItem svtXClearFix" data-url="' + videoInfo.url + '"></li>');
		var playButton = $('<div class="playlistPlayButton" title="' + videoInfo.title + '" tabindex="0">' + videoInfo.title + '</div>');
		playButton.click(function() {
		  self.playVideo(playButton, videoList);
		});
		playButton.keypress(function(e) {
		  var code = e.keyCode || e.which;
      if(code == 13) {
  		  self.playVideo(playButton, videoList);
      }
		});
		video.append(playButton);
		var removeButton = $('<button class="playlistButton playlistRemoveButton">x</button>');
		removeButton.click(function() {
			var listItem = $(this).parent();
			self.playlist.remove(listItem.attr("data-url"));
			listItem.remove();
		});
		video.append(removeButton);
		videoList.append(video);
	};
	
	this.playVideo = function(playButton, videoList) {
	  if(!this.isEditing) {
			videoList.find('.playlistActiveVideo').removeClass('playlistActiveVideo');
			playButton.addClass('playlistActiveVideo');
			this.loadPlayer(playButton.parent().attr("data-url"));
	  }
	};
	
}

load_script("http://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js");
load_script("http://code.jquery.com/ui/1.8.24/jquery-ui.js");
load_script("http://www.svtplay.se/public/2099.99/javascripts/script-built.js");

//removes broken hover effect in video grid
$('.playJsTabs').on({
	'mouseenter': function() { return false; },
	'mouseleave': function() { return false; }
}, '.playJsInfo-Hover');


var currentPage = new Page();
var playlist = new Playlist();
playlist.removeExpiredVideos();
var overlay = new Overlay(playlist, currentPage);

if(currentPage.isLocalhost()) {
  load_css("http://localhost:7007/src/bookmarklet.css");
} else {
  load_css("http://bjarlestam.github.io/svtplaylist/src/bookmarklet.css");
}

if(!currentPage.isSvtplay() && !currentPage.isLocalhost()) {
	overlay.showMessage('Gå till <a href="http://www.svtplay.se">SVT Play</a>, leta upp ett program som du vill ha med i din spellista och klicka på bokmärket igen.');
} else {
  overlay.show();
}
