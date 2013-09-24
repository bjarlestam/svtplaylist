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

	this.moveUp = function(url) {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
			if(playList[i].url === url && i > 0) {
				var entry = playList[i];
				playList.splice(i,1);
				playList.splice(i-1,0, entry);
				this.store(playList);
				return;
			}
		}
	};

	this.moveDown = function(url) {
		var playList = this.get();
		for(var i=0; playList && i < playList.length; i++) {
			if(playList[i].url === url && i < playList.length - 1) {
				var entry = playList[i];
				playList.splice(i,1);
				playList.splice(i+1,0, entry);
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
}

function Overlay(playlist, page) {
	this.overlay = undefined;
	this.player = undefined;
	this.playlist = playlist;
	this.addButton = undefined;

	this.show = function() {
		var self = this;
		this.overlay = $('<div id="playlistOverlay"></div>' );

		var closeButton = $('<button id="playlistCloseButton" class="playlistButton">stäng</button>');
		closeButton.click(function() {
			self.hide();
		});
		this.overlay.append(closeButton);

		var menu = $(
				'<div id="playlistMenu">' +
						'<h2>SVT Playlist</h2>' +
						'<ol id="playlistVideos"></ol>' +
						'</div>');

		if($('#player').size() > 0 && !this.playlist.hasVideo(page.getVideoInfo().url)) {
			this.addButton = $('<div id="playlistAddButton"><span class="playIcon playIcon-Plus"></span> Lägg till den här videon </div>');
			this.addButton.click(function() {
				var videoInfo = page.getVideoInfo();
				if(playlist.add(videoInfo)) {
					self.addVideoToList(videoInfo, self.overlay.find('#playlistVideos'));
					self.addButton.hide();
				}
			});
			menu.append(this.addButton);
		}
		this.overlay.append(menu);

		this.loadVideoList(this.overlay.find('#playlistVideos'));

		this.player = $('<div id="playlistPlayer"></div>');
		this.player.hide();
		this.overlay.append(this.player);
		this.overlay.css({left: '-500px'});
		$(document.body).append(this.overlay);
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

	this.loadPlayer = function(videoUrl) {
		this.player.empty().load(videoUrl + ' .svtFullFrame', function() {
			$('.svtplayer').each(function(){
				if(!$(this).hasClass('svtplayerInitialized')){
					new svtplayer.SVTPlayer($(this));
					subscribe('/player/onVideoEnd', function() {
						var next = $('.playlistActiveVideo').parent().next();
						if(next.size() > 0) {
							next.find('.playlistPlayButton').click();
						}
						console.log(next);
					});
				}
			});
		});
		this.player.show();
	};

	this.loadVideoList = function(videoList) {
		var videoInfoList = this.playlist.get();
		for(var i=0; i < videoInfoList.length; i++) {
			this.addVideoToList(videoInfoList[i], videoList);
		}
	};

	this.addVideoToList = function(videoInfo, videoList) {
		var self = this;
		var video = $('<li data-url="' + videoInfo.url + '"></li>');
		var playButton = $('<span class="playlistPlayButton" title="' + videoInfo.title + '">' + videoInfo.title + '</span>');
		playButton.click(function() {
			videoList.find('.playlistActiveVideo').removeClass('playlistActiveVideo');
			playButton.addClass('playlistActiveVideo');
			self.loadPlayer($(this).parent().attr("data-url"));
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
}

load_script("http://ajax.googleapis.com/ajax/libs/jquery/1.8.1/jquery.min.js");
load_script("http://www.svtplay.se/public/2099.99/javascripts/script-built.js");
load_css("http://bjarlestam.github.io/svtplaylist/src/bookmarklet.css");

//remove broken hover effect in video grid
$('.playJsTabs').on({
	'mouseenter': function() { return false; },
	'mouseleave': function() { return false; }
}, '.playJsInfo-Hover');


var currentPage = new Page();
var playlist = new Playlist();
var overlay = new Overlay(playlist, currentPage);

if(!currentPage.isSvtplay()) {
	currentPage.goToSvtplay();
}
overlay.show();