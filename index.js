/**
 * Original code nexu-dev, https://github.com/nexu-dev/discord.js-client
 * Tweeked by Demise.
 * Tweeked by D0cR3d.
 */

var Downloader = require('filedownloader');
var YoutubeMp3Downloader = require('youtube-mp3-downloader');
const YouTubeAPI = require("discord-youtube-api");

// const {Client} = require('discord.js');
const Discord = require('discord.js');
const EventEmitter = require('events');

class Emitter extends EventEmitter {}
const emitter = new Emitter();

 /**
  * Takes a discord.js client and turns it into a client bot.
  * Thanks to Rodabaugh for helping with some tweaks and ideas.
  *
  * @param {Client} client - The discord.js client.
  * @param {object} options - Options to configure the client bot.
  *
  * Refer to the readme.md and the code for full list of options supported.
  */

module.exports = function (client, options) {
	// Get all options.
	class Music {
		constructor(client, options) {
			this.youtubeKey = (options && options.youtubeKey);
			this.musicVoiceChannelId = (options && options.musicVoiceChannelId);
			this.ffmpegPath = (options && options.ffmpegPath);

			// Inits YouTube API
			this.youtubeAPI = new YouTubeAPI(this.youtubeKey);

			this.botPrefix = (options && options.prefix) || '!';
			this.global = (options && options.global) || false;
			this.maxQueueSize = parseInt((options && options.maxQueueSize) || 20);
			
			this.anyoneCanSkip = (options && options.anyoneCanSkip) || false;
			this.clearInvoker = (options && options.clearInvoker) || false;

			this.helpCmd = (options && options.helpCmd) || 'musichelp';
			this.disableHelp = (options && options.disableHelp) || false;

			this.playCmd = (options && options.playCmd) || 'play';
			this.disablePlay = (options && options.disablePlay) || false;

			this.skipCmd = (options && options.skipCmd) || 'skip';
			this.disableSkip = (options && options.disableSkip) || false;

			this.deleteCmd = (options && options.deleteCmd) || 'delete';
			this.disableDelete = (options && options.disableDelete) || false;

			this.nowPlayingCmd = (options && options.nowPlayingCmd) || 'nowplaying';
			this.disableNowPlaying = (options && options.disableNowPlaying) || false;

			this.queueCmd = (options && options.queueCmd) || 'queue';
			this.disableQueue = (options && options.disableQueue) || false;

			this.pauseCmd = (options && options.pauseCmd) || 'pause';
			this.disablePause = (options && options.disablePause) || false;

			this.resumeCmd = (options && options.resumeCmd) || 'resume';
			this.disableResume = (options && options.disableResume) || false;

			this.defVolume = parseInt((options && options.volume) || 25);
			this.volumeCmd = (options && options.volumeCmd) || 'volume';
			this.disableVolume = (options && options.disableVolume) || false;

			this.leaveCmd = (options && options.leaveCmd) || 'leave';
			this.disableLeave = (options && options.disableLeave) || false;

			this.clearCmd = (options && options.clearCmd) || 'clearqueue';
			this.disableClear = (options && options.disableClear) || false;

			this.loopCmd = (options && options.loopCmd) || 'loop';
			this.disableLoop = (options && options.disableLoop) || false;

			this.enableQueueStat = (options && options.enableQueueStat) || true;
			this.anyoneCanAdjust = (options && options.anyoneCanAdjust) || false;
			this.ownerOverMember = (options && options.ownerOverMember) || false;
			this.botOwner = (options && options.botOwner) || null;
			this.logging = (options && options.logging) || false;
			this.loop = 'false';
		}
	}

	var musicbot = new Music(client, options);

	checkErrors();

	//Set the YouTube API key.
	const opts = {
		maxResults: 1,
		key: musicbot.youtubeKey
	};

	// Create an object of queues.
	let queues = {};

	// Catch message events.
	client.on('message', msg => {
		try {
			const message = msg.content.trim();

			// Check if the message is a command.
			if (message.toLowerCase().startsWith(musicbot.botPrefix.toLowerCase())) {
				// Get the command, suffix and bot.
				const command = message.substring(musicbot.botPrefix.length).split(/[ \n]/)[0].toLowerCase().trim();
				const suffix = message.substring(musicbot.botPrefix.length + command.length).trim();

				// Process the commands.
				switch (command) {
					case musicbot.helpCmd:
						if (musicbot.disableHelp) return;
						return musicbothelp(msg, suffix);
					case musicbot.playCmd:
						if (musicbot.disablePlay) return;
						return play(msg, suffix);
					case musicbot.skipCmd:
						if (musicbot.disableSkip) return;
						return skip(msg, suffix);
					case musicbot.queueCmd:
						if (musicbot.disableQueue) return;
						return listQueue(msg, suffix);
					case 'q':
						if (musicbot.disableQueue) return;
						return listQueue(msg, suffix);
					case musicbot.pauseCmd:
						if (musicbot.disablePause) return;
						return pause(msg, suffix);
					case musicbot.resumeCmd:
						if (musicbot.disableResume) return;
						return resume(msg, suffix);
					case musicbot.volumeCmd:
						if (musicbot.disableVolume) return;
						return volume(msg, suffix);
					case 'vol':
						if (musicbot.disableVolume) return;
						return volume(msg, suffix);
					case musicbot.leaveCmd:
						if (musicbot.disableLeave) return;
						return leave(msg, suffix);
					case musicbot.clearCmd:
						if (musicbot.disableClear) return;
						return clearqueue(msg, suffix);
					case musicbot.loopCmd:
						if (musicbot.disableLoop) return;
						return loop(msg, suffix);
					case musicbot.deleteCmd:
						if (musicbot.disableDelete) return;
						return deleteCmd(msg, suffix);
					case 'del':
						if (musicbot.disableDelete) return;
						return deleteCmd(msg, suffix);
					case musicbot.nowPlayingCmd:
						if (musicbot.disableNowPlaying) return;
						return getNowPlaying(msg);
					case 'current':
						if (musicbot.disableNowPlaying) return;
						return getNowPlaying(msg);
					case 'modplay':
						return modSpecialAddToQueue(msg, suffix);
				}
				if (musicbot.clearInvoker) {
					msg.delete();
				}
			}
		} catch (error) {
			console.error(`There was a general error in the bot. Error: ${error}`);
		};
	});

	/**
	 * Checks if a user is a mod.
	 *
	 * @param {GuildMember} member - The guild member
	 * @returns {boolean} -
	 */
	function isMod(member) {
		return member.hasPermission('MANAGE_GUILD');
	}

	/**
	 * Checks if a user is a DJ.
	 *
	 * @param {GuildMember} member - The guild member
	 * @returns {boolean} -
	 */
	function isDJ(member) {
		if (member.roles.exists('name', 'DJ')) { 
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Checks if a message in authorized channel.
	 *
	 * @param {Message} Message - Message sent
	 * @returns {boolean} -
	 */
	function isAuthorizedChannel(msg) {
		if (isMod(msg.member) || msg.channel.id === '365686365532454912' || msg.channel.id === '363462844693479434') {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Checks if the user can skip the song.
	 *
	 * @param {GuildMember} member - The guild member
	 * @param {array} queue - The current queue
	 * @returns {boolean} - If the user can skip
	 */
	function canSkip(member, queue) {
		if (musicbot.ownerOverMember && member.id === musicbot.botOwner) return true;
		if (musicbot.anyoneCanSkip) return true;
		else if (isMod(member)) return true;
		else if (isDJ(member)) return true;
		else return false;
	}

	/**
	 * Checks if the user can delete the song.
	 *
	 * @param {GuildMember} member - The guild member
	 * @param {array} queue - The current queue
	 * @param {array} song - The song to delete
	 * @returns {boolean} - If the user can delete
	 */
	function canDelete(member, queue, toDelete) {
		if (queue[toDelete].requester === member.id) return true;
		else if (isMod(member)) return true;
		else if (isDJ(member)) return true;
		else return false;
	}

	/**
	 * Checks if the user can adjust volume.
	 *
	 * @param {GuildMember} member - The guild member
	 * @param {array} queue - The current queue
	 * @returns {boolean} - If the user can adjust
	 */
	function canAdjust(member, queue) {
		if (musicbot.anyoneCanAdjust) return true;
		else if (isMod(member)) return true;
		else if (isDJ(member)) return true;
		else return false;
	}

	/**
	 * Gets the song queue of the server.
	 *
	 * @param {integer} server - The server id.
	 * @returns {object} - The song queue.
	 */
	function getQueue(server) {
		// Check if global queues are enabled.
		if (musicbot.global) server = '_'; // Change to global queue.

		// Return the queue.
		if (!queues[server]) queues[server] = [];
		return queues[server];
	}

	/**
	 * The help command.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response edit.
	 */
	function musicbothelp(msg, suffix) {
		if (!suffix || suffix.includes('help')) {
			const embed = new Discord.RichEmbed();
			embed.setAuthor('Commands', msg.author.displayAvatarURL)
			embed.setDescription(`Commands with a * require Mod or DJ perms. Use \`${musicbot.botPrefix}${musicbot.helpCmd} <command>\` for help on usage.`)
			embed.addField(musicbot.helpCmd, `Displays this text.`)
			if (!musicbot.disablePlay) embed.addField(musicbot.playCmd, `Queue a song/playlist by url or search for a song.`)
			if (!musicbot.disableSkip) embed.addField(musicbot.skipCmd, `* Skip a song or multiple songs.`)
			if (!musicbot.disableQueue) embed.addField(musicbot.queueCmd, `Shows the current queue`)
			if (!musicbot.disablePause) embed.addField(musicbot.pauseCmd, `* Pauses the queue.`)
			if (!musicbot.disableResume) embed.addField(musicbot.resumeCmd, `* Resume the queue.`)
			if (!musicbot.disableVolume) embed.addField(musicbot.volumeCmd, `* Adjusts the volume of the bot.`)
			if (!musicbot.disableLeave) embed.addField(musicbot.leaveCmd, `* Stops music and clears the queue.`)
			if (!musicbot.disableClear) embed.addField(musicbot.clearCmd, `* Clears the current queue.`)
			if (!musicbot.disableDelete) embed.addField(musicbot.deleteCmd, `* Deletes the specified song from the queue.`)
			if (!musicbot.disableNowPlaying) embed.addField(musicbot.nowPlayingCmd, `Shows current song playing.`)
			embed.setColor(0x27e33d)
			msg.member.user.send({embed});
		} else {
			if (suffix === musicbot.playCmd) {
				if (musicbot.disablePlay) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.playCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Addes a song to the queue.\n**__Usage:__** ${musicbot.botPrefix}${musicbot.playCmd} Video URL | Playlist URL | search for something.`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.skipCmd)) {
				if (musicbot.disableSkip) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.skipCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Skips the playing song or multi songs. You must be a DJ or an Admin.\n**__Usage:__** ${musicbot.botPrefix}${musicbot.skipCmd} [numer of songs]`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.queueCmd)) {
				if (musicbot.disableQueue) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.queueCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Displays the current queue.`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.pauseCmd)) {
				if (musicbot.disablePause) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.pauseCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Pauses the current queue. You must be a DJ or an Admin.`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.resumeCmd)) {
				if (musicbot.disableResume) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.resumeCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Resumes the current queue if paused. You must be a DJ or an Admin.`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.volumeCmd)) {
				if (musicbot.disableVolume) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.volumeCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Adjusts the streams volume. You must be a DJ or an Admin.\n**__Usage:__** ${musicbot.botPrefix}${musicbot.volumeCmd} <1 to 100>`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.leaveCmd)) {
				if (musicbot.disableLeave) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.leaveCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Leaves the voice channel and clears the queue. You must be an Admin.`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.clearCmd)) {
				if (musicbot.disableClear) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.clearCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Clears the current queue playing. You must be an Admin.`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.loopCmd)) {
				if (musicbot.disableLoop) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.loopCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Enables/disables looping of the currently being played song. You must be an Admin.`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.deleteCmd)) {
				if (musicbot.disableDelete) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.deleteCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Deletes specified song from the queue. You must be a DJ or an Admin or the person who requested the song.\n**__Usage:__** ${musicbot.botPrefix}${musicbot.deleteCmd} <Song Number>`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else if (suffix.includes(musicbot.nowPlayingCmd)) {
				if (musicbot.disableNowPlaying) return msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`${musicbot.botPrefix}${musicbot.nowPlayingCmd}`, client.user.displayAvatarURL);
				embed.setDescription(`Shows what song is currently playing.\n**__Usage:__** ${musicbot.botPrefix}${musicbot.nowPlayingCmd}`);
				embed.setColor(0x27e33d);
				msg.member.user.send({embed});
			} else {
				msg.member.user.send(note('fail', `${suffix} is not a valid command!`));
			};
		};
	};

	/**
	 * The command for adding a song to the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response edit.
	 */
	function play(msg, requestQuery) {
		// Make sure the user is in a voice channel or is Mod/DJ
		if (isMod(msg.member) || isDJ(msg.member) || (msg.member.voiceChannel && msg.member.voiceChannel.id === musicbot.musicVoiceChannelId)) {
			if (isAuthorizedChannel(msg)) {
				// Make sure the requestQuery exists.
				if (!requestQuery) return msg.channel.send(note('fail', 'No video specified!'));

				// Get the queue.
				const queue = getQueue(msg.guild.id);

				// Check if the queue has reached its maximum size.
				if ((queue.length >= musicbot.maxQueueSize) && !isMod(msg.member)) {
					return msg.channel.send(note('fail', 'Maximum queue size reached!'));
				}

				// Get the video information.
				msg.channel.send(note('note', 'Searching...'))
					.then(newMsg => {
						if (requestQuery.includes('?list=')) {
							newMsg.edit(note('fail', 'Sorry, playlists are not supported at this time.'))
								.then(() => {
									return;
								}).catch((error) => { console.error(error); });
						} else if (requestQuery.includes('youtube.com') || requestQuery.includes('youtu.be')) {
							// Get by URL
							musicbot.youtubeAPI.getVideo(requestQuery)
								.then(videoData => {
									downloadHandler(videoData, msg, newMsg);

								}).catch((error) => { 
									newMsg.channel.send(note('fail', `Error retrieving that link. \n${error}\n---\n**Request Query:** ${requestQuery}`));
									console.error(error);
								});
						} else {
							// Search for it
							musicbot.youtubeAPI.searchVideos(requestQuery)
								.then(videoData => {
									downloadHandler(videoData, msg, newMsg);

								}).catch((error) => { 
									newMsg.channel.send(note('fail', `Error searching for that item. \n${error}\n---\n**Request Query:** ${requestQuery}`));
									console.error(error);
								});
						}
					}).catch((error) => { console.error(error); });
			} else {
				return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
			}
		} else {
			return msg.member.user.send(note('fail', 'You must be a `Mod`, `DJ`, or in the Music voice channel.'));
		}			
	}

	/**
	 * The MOD command for adding a specifc URL to the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response edit.
	 */
	function modSpecialAddToQueue(msg, suffix) {
		// Make sure the user is in a voice channel or is Mod/DJ
		if (isMod(msg.member)) {

			// Make sure the suffix exists.
			if (!suffix) return msg.channel.send(note('fail', 'No link specified!'));

			// Get the queue.
			const queue = getQueue(msg.guild.id);

			// Check if the queue has reached its maximum size.
			if ((queue.length >= musicbot.maxQueueSize) && !isMod(msg.member)) {
				return msg.channel.send(note('fail', 'Maximum queue size reached!'));
			}

			// Get the video information.
			msg.channel.send(note('note', 'Searching...')).then(response => {
				var results = {};
				if (suffix.includes('bungiepodcast')) {
					results.link = 'https://discord.gg/DestinyReddit';
					// results.fileLink = '/Users/Mike/Development/rDestinyTheGame/Sweeper-Bot/storage/podcast.mp3'; // Dev link
					results.fileLink = '/opt/skynet/Discord/sweeper-prod/storage/podcast.mp3'; // Prod link
					results.title = 'The Bungie Podcast – November 2017';
					results.description = 'Join Luke Smith, Mark Noseworthy, and Eric Osborne as they sound off on the state of Destiny 2, what it takes to update the game, and where we’re heading next.';
					results.length = 'unknown';
					results.durationSeconds = 0;
					results.requesterName = `${msg.author.username}#${msg.author.discriminator}`;
					results.requester = msg.author.id;

					response.edit(note('note', 'Queued: ' + results.title)).then(() => {
						queue.push(results);
						// Play if only one element in the queue.
						if (queue.length === 1) executeQueue(msg, queue);
					}).catch(console.log);
					return;
				} else {
					const timestamp = Math.round((new Date()).getTime() / 1000);
					const fileExt = suffix.substring(suffix.lastIndexOf('.')+1);

					results.timestamp = timestamp;
					results.fileExt = fileExt;
					results.link = suffix;
					results.fileLink = `/tmp/${timestamp}.${fileExt}`;
					results.title = 'This link was queued by a Mod - No title available';
					results.description = 'This link was queued by a Mod - No description available';
					results.length = 'unknown';
					results.durationSeconds = 0;
					results.requesterName = `${msg.author.username}#${msg.author.discriminator}`;
					results.requester = msg.author.id;

					downloadFile(response, results);
	
				};
			}).catch(console.log);
		} else {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}		
	}

	/**
	* Downloads file and queue's once download finished.
	*/
	function downloadFile(response, results) {
		var fileDownload = new Downloader({
			url: results.link,
			saveas: `${results.timestamp}.${results.fileExt}`,
			saveto: '/tmp/'
		});

		fileDownload.on('start', function(){
			response.edit('Download started: ' + results.title);
		});

		fileDownload.on('progress', function(progress){
			response.edit('Download progress: ' + progress.progress + '% for: ' + results.title);
		});

		fileDownload.on('error', function(error){
			return response.edit('Download error: ' + error);
		});

		fileDownload.on('end', function(){
			response.edit(note('note', 'Download finished. Queued: ' + results.title)).then(() => {
				// Get the queue.
				const queue = getQueue(response.guild.id);
				queue.push(results);
				// Play if only one element in the queue.
				if (queue.length === 1) executeQueue(response, queue);
			}).catch(console.log);
			return;
		});
	}

	/**
	* Download handler.
	*/
	function downloadHandler(videoData, origMsg, newMsg) {

		videoData.timestamp = Math.round(new Date().getTime());
		videoData.fileExt = 'mp3';
		videoData.link = `https://www.youtube.com/watch?v=${videoData.id}`;
		videoData.fileLink = `/tmp/${videoData.timestamp}.${videoData.fileExt}`;
		videoData.requesterName = `${origMsg.author.username}#${origMsg.author.discriminator}`;
		videoData.requester = origMsg.author.id;

		downloadYT(newMsg, videoData)
			.then(() => {
				// download complete
				newMsg.edit(note('note', 'Download finished. Queued: ' + videoData.title)).then(() => {
					// Get the queue.
					const queue = getQueue(origMsg.guild.id);
					queue.push(videoData);
					// Play if only one element in the queue.
					if (queue.length === 1) {
						return executeQueue(origMsg, queue);
					};
				}).catch((error) => { console.error(error); });
			}).catch((error) => { console.error(error); });
	}

	/**
	* Downloads a YT link and queue's once download finished.
	*/
	function downloadYT(newMsg, video) {
		return new Promise((resolve, reject) => {
			//Configure YoutubeMp3Downloader with your settings 
			var fileDownload = new YoutubeMp3Downloader({
				'ffmpegPath': this.ffmpegPath,			// Where is the FFmpeg binary located?
				'outputPath': '/tmp',					// Where should the downloaded and encoded files be stored?
				'youtubeVideoQuality': 'highest',		// What video quality should be used?
				'queueParallelism': 5,					// How many parallel downloads/encodes should be started?
				'progressTimeout': 2000					// How long should be the interval of the progress reports
			});
			 
			//Download video and save as MP3 file 
			fileDownload.download(video.id, `${video.timestamp}.${video.fileExt}`);
			 
			fileDownload.on('progress', function(progress) {
				newMsg.edit('Download progress: ' + progress.progress.percentage.toFixed(2) + '% for: ' + video.title);
			});

			fileDownload.on('error', function(error) {
				console.error(error);
				newMsg.edit(note('fail', `Download failed for: ${video.title}\n\nError:\n${error}`));
				return reject(new Error(`Download failed for: ${video.title}\n\nError:\n${error}`));
			});

			fileDownload.on('finished', function(err, data) {
				return resolve(video);
			});
		});
	}

	/**
	 * Executes the next song in the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {object} queue - The song queue for this server.
	 * @returns {<promise>} - The voice channel.
	 *
	 * This has a known bug where if a mod starts the initial queue in another channel
	 * then the bot will send all future 'Now Playing' or 'Playback Finished' notifications
	 * to that channel due to it constantly self-referencing 'msg' which is the original
	 * message that started it. Potential solution involves storing the msg object
	 * to the queue object that the users request came in on, then passing that
	 * 'queue[0].msg' into executeQueue().
	 */
	function executeQueue(msg, queue) {
		// If the queue is empty, finish.
		if (queue.length === 0) {
			msg.channel.send(note('note', 'Playback finished.'));

			// Leave the voice channel.
			const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
			if (voiceConnection !== null) return voiceConnection.disconnect();
		}

		new Promise((resolve, reject) => {
			// Join the voice channel if not already in one.
			const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
			if (voiceConnection === null) {

				const musicVoiceChannel = client.channels.get(musicbot.musicVoiceChannelId);
				// Connect to the voice channel
				if (musicVoiceChannel) {
					musicVoiceChannel.join().then(connection => {
						resolve(connection);
					}).catch((error) => { console.error(error); });
				} else {
					// Otherwise, clear the queue and do nothing.
					queue.splice(0, queue.length);
					reject();
				}
			} else {
				resolve(voiceConnection);
			}
		}).then(connection => {
			// Play the video.
			
			getNowPlaying(msg);
			let dispatcher = connection.playFile(queue[0].fileLink, {seek: 0, volume: (musicbot.defVolume/100), bitrate: 'auto'});

			connection.on('error', (error) => {
				// Skip to the next song.
				console.error(error);
				queue.shift();
				executeQueue(msg, queue);
			});

			dispatcher.on('error', (error) => {
				// Skip to the next song.
				console.error(error);
				queue.shift();
				executeQueue(msg, queue);
			});

			dispatcher.on('end', () => {
				if (musicbot.loop === 'true') {
					executeQueue(msg, queue);
				} else {
					if (queue.length > 0) {
						// Move to next song
						queue.shift();
						executeQueue(msg, queue);
					}
				}
			});
			
		}).catch((error) => {
			console.error(error);
			msg.channel.send(note('fail', `There was an error playing that item.`));
			// Remove the song from the queue.
			queue.shift();
			// Play the next song in the queue.
			executeQueue(msg, queue);
		});
	}

	/**
	 * The command for skipping a song.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function skip(msg, suffix) {
		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(note('fail', 'No music being played.'));

		// Get the queue.
		const queue = getQueue(msg.guild.id);

		if (!canSkip(msg.member, queue)) return msg.member.user.send(note('fail', 'You cannot skip this. You must be a `Mod` or a `DJ`.')).then((response) => {
			response.delete(7000);
		});

		if (!isAuthorizedChannel(msg)) {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}

		// Get the number to skip.
		let toSkip = 1; // Default 1.
		if (!isNaN(suffix) && parseInt(suffix) > 0) {
			toSkip = parseInt(suffix);
		}
		toSkip = Math.min(toSkip, queue.length);

		// Skip.
		queue.splice(0, toSkip - 1);

		// Resume and stop playing.
		try {
			const dispatcher = voiceConnection.player.dispatcher;
			if (voiceConnection.paused) dispatcher.resume();
			dispatcher.end();
		} catch (e) {
			if (musicbot.logging) console.log(new Error(`Play command error from userID ${msg.author.id} in guildID ${msg.guild.id}\n${e.stack}`));
			return msg.member.user.send(note('fail', 'An error occoured, sorry!'));
		};

		msg.channel.send(note('note', 'Skipped ' + toSkip + '!'));
	}

	/**
	 * The command for listing the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 */
	function listQueue(msg, suffix) {
		if (!isAuthorizedChannel(msg)) {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}

		try {
			// Get the queue.
			const queue = getQueue(msg.guild.id);

			if (queue[0]){
				// Get the queue text.
				const embed = new Discord.RichEmbed();
				embed.setThumbnail('https://cdn1.iconfinder.com/data/icons/appicns/513/appicns_iTunes.png');
				embed.setColor('RED');
				var totalQueueTime = null;
				queue.map(function (video, index) {
					totalQueueTime += video.durationSeconds;
					if (index === 25) {
						// skip
					} else {
						embed.addField(`${index + 1}: ${video.title.substr(0, 250)}`, `Duration: ${video.length} | Requested By: <@!${video.requester}>`);
					}
				});
				const formatted = secondsToHMS(totalQueueTime);
				embed.setTitle(`Total Music Queue Time: ${formatted}`);
				msg.channel.send({ embed: embed });
			} else {
				return msg.channel.send(note('fail', 'The queue is currently empty. Use `-play <YouTube Link|Search Query>` to add something.'));
			}
		} catch (error) {
			console.error(new Error(`List Queue error from userID ${msg.author.id} in guildID ${msg.guild.id}\n${error.stack}`));
			return;
		};
	}

	/**
	 * The command for listing the first song in the queue.
	 *
	 * @param {Message} msg - Original message.
	 */
	function getNowPlaying(msg) {
		try {
			if (!isAuthorizedChannel(msg)) {
				return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
			}
			// Get the queue.
			const queue = getQueue(msg.guild.id);
			if (queue[0]){
				const embed = new Discord.RichEmbed();
				embed.setAuthor(`Currently Playing:`, 'https://cdn1.iconfinder.com/data/icons/appicns/513/appicns_iTunes.png');
				embed.setTitle(queue[0].title.substr(0, 235));
				embed.setURL(queue[0].link);
				embed.setThumbnail(queue[0].thumbnail);
				embed.setColor('RED');
				embed.setFooter(`Duration: ${queue[0].length} | Vol: ${musicbot.defVolume}% | Requested By: ${queue[0].requesterName}`);
				
				return msg.channel.send({ embed: embed });
			} else {
				return msg.channel.send(note('fail', 'There isn\'t anything playing. Use `-play <YouTube Link|Search Query>` to add something.'));
			}
		} catch (error) {
			console.error(new Error(`Unable to get Now Playing: Initiator: ${msg.author.id} in guildID: ${msg.guild.id}\n${error.stack}`));
			return;
		};
	}

	/**
	 * The command for pausing the current song.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function pause(msg, suffix) {
		if (!isAuthorizedChannel(msg)) {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}

		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(note('fail', 'No music being played.'));

		if (isMod(msg.member) || isDJ(msg.member)) {
			// Pause.
			msg.channel.send(note('note', 'Playback paused.'));
			const dispatcher = voiceConnection.player.dispatcher;
			if (!dispatcher.paused) dispatcher.pause();
		} else {
			return msg.member.user.send(note('fail', 'You are not authorized to use this. You must be a Mod or have the DJ role.'));
		}
	}

	/**
	 * The command for leaving the channel and clearing the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function leave(msg, suffix) {
		if (!isAuthorizedChannel(msg)) {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}

		if (isMod(msg.member) || isDJ(msg.member)) {
			const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
			if (voiceConnection === null) return msg.channel.send(note('fail', 'I\'m not in any channel!.'));
			// Clear the queue.
			const queue = getQueue(msg.guild.id);
			queue.splice(0, queue.length);

			// End the stream and disconnect.
			voiceConnection.player.dispatcher.end();
			voiceConnection.disconnect();
			// msg.channel.send(note('note', 'Left voice channel.'));
		} else {
			msg.member.user.send(note('fail', 'You don\'t have permission to use that command!'));
		}
	}

	/**
	 * The command for clearing the song queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 */
	function clearqueue(msg, suffix) {
		if (!isAuthorizedChannel(msg)) {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}

		if (isMod(msg.member) || isDJ(msg.member)) {
			const queue = getQueue(msg.guild.id);
			const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
			if (voiceConnection === null) return msg.channel.send(note('fail', 'I\'m not in any channel!.'));

			queue.splice(1, queue.length);
			msg.channel.send(note('note', 'Queue cleared.'));
		} else {
			msg.member.user.send(note('fail', `You don't have permission to use that command, only admins may!`));
		}
	}

	/**
	 * The command for resuming the current song.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function resume(msg, suffix) {
		if (!isAuthorizedChannel(msg)) {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}

		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(note('fail', 'No music being played.'));

		if (isMod(msg.member) || isDJ(msg.member)) {
			// Resume.
			const dispatcher = voiceConnection.player.dispatcher;
			if (dispatcher.paused) dispatcher.resume();
			msg.channel.send(note('note', 'Playback resumed.'));
		} else {
			msg.member.user.send(note('fail', 'You don\'t have permission to use that command!'));
		}
	}

	/**
	 * The command for changing the song volume.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 */
	function volume(msg, suffix) {
		if (!isAuthorizedChannel(msg)) {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}

		if (!suffix) {
			return msg.channel.send(note('note', `Volume is currently: ${musicbot.defVolume}`));
		}

		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(note('fail', 'No music being played.'));

		// Get the queue.
		const queue = getQueue(msg.guild.id);

		if (!canAdjust(msg.member, queue))
			return msg.member.user.send(note('fail', 'You are not authorized to use this. Only the Mods or DJs can.'));

		// Get the dispatcher
		const dispatcher = voiceConnection.player.dispatcher;

		if (suffix > 100 || suffix < 0) return msg.channel.send(note('fail', 'Volume out of range! Must be between 1 and 100.')).then((response) => {
			response.delete(5000);
		});

		dispatcher.setVolume((suffix/100));
		musicbot.defVolume = parseInt(suffix);
		msg.channel.send(note('note', `Volume set to: ${suffix}`));
	}

	/**
	 * Looping command/option.
	 *
	 * @param {Message} msg - Original message.
	 * @param {object} queue - The song queue for this server.
	 * @param {string} suffix - Command suffix.
	 */
	function loop(msg, suffix) {
		if (musicbot.loop === 'true') {
			musicbot.loop = 'false';
			msg.channel.send(note('note', 'Looping disabled! :arrow_forward:'));
		} else if (musicbot.loop === 'false') {
			musicbot.loop = 'true';
			msg.channel.send(note('note', 'Looping enabled! :repeat_one:'));
		}
	};

	/**
	 * Removes item from the queue.
	 *
	 * @param {Message} msg - Original message.
	 * @param {string} suffix - Command suffix.
	 * @returns {<promise>} - The response message.
	 * 
	 */
	function deleteCmd(msg, suffix) {
		// Get the queue.
		const queue = getQueue(msg.guild.id);

		// If no music in the queue, return.
		if (queue.size === 0) return msg.channel.send(note('fail', 'There is no music in the queue.'));

		// Get the song number to delte.
		let toDelete = 0;
		if (!isNaN(suffix)) {
			toDelete = parseInt(suffix);
			if ((toDelete >= 2) && (toDelete <= queue.length)) {
				// Continue
			} else {
				return msg.channel.send(note('fail', `Please specify a number within the limit of the queue (**2** to **${queue.length}**). If you want to skip the current song please use \`-skip\` if you are the requestor, a mod, or a DJ.`));
			}
		} else {
			return msg.channel.send(note('fail', `Please specify a number for what item to remove from the queue.`));
		}

		if (!canDelete(msg.member, queue, toDelete -1)) {
			return msg.member.user.send(note('fail', 'You cannot delete this. You must be a `Mod`, `DJ`, or be the one who requested it.'));
		}

		if (!isAuthorizedChannel(msg)) {
			return msg.member.user.send(note('fail', 'This command can only be run in the #music-discussion channel.'));
		}

		// Delete it.
		queue.splice(toDelete -1, 1);

		msg.channel.send(note('note', `Deleted #${toDelete}!`));
	}

	//Text wrapping and cleaning.
	function note(type, text) {
		if (type === 'wrap') {
			ntext = text
			.replace(/`/g, '`' + String.fromCharCode(8203))
			.replace(/@/g, '@' + String.fromCharCode(8203))
			.replace(client.token, 'REMOVEDT');

			return '```\n' + ntext + '\n```';
		} else if (type === 'note') {
			return ':musical_note: | ' + text.replace(/`/g, '`' + String.fromCharCode(8203));
		} else if (type === 'fail') {
			return ':no_entry_sign: | ' + text.replace(/`/g, '`' + String.fromCharCode(8203));
		} else {
			const harp = new Error(`${type} was an invalid type; note function`);
			console.error(harp);
		}
	}

	function secondsToHMS(duration) {
		duration = Number(duration);
		var h = Math.floor(duration / 3600);
		var m = Math.floor(duration % 3600 / 60);
		var s = Math.floor(duration % 3600 % 60);

		var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
		var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
		var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
		return hDisplay + mDisplay + sDisplay; 
	}

	//Init errors.
	function checkErrors() {
		if (process.version.slice(1).split('.')[0] < 8) console.log(new Error('Node 8.0.0 or higher was not found, 8+ is recommended. You may still use your version however.'));
		if (!musicbot.youtubeKey) {
			console.log(new Error(`youtubeKey is required but missing`));
			process.exit(1);
		};
		if (musicbot.youtubeKey && typeof musicbot.youtubeKey !== 'string') {
			console.log(new TypeError(`youtubeKey must be a string`));
			process.exit(1);
		};

		//Disable commands erros.
		if (typeof musicbot.disableHelp !== 'boolean') {
			console.log(new TypeError(`disableHelp must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disablePlay !== 'boolean') {
			console.log(new TypeError(`disablePlay must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disableSkip !== 'boolean') {
			console.log(new TypeError(`disableSkip must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disableDelete !== 'boolean') {
			console.log(new TypeError(`disableDelete must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disableQueue !== 'boolean') {
			console.log(new TypeError(`disableQueue must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disablePause !== 'boolean') {
			console.log(new TypeError(`disablePause must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disableResume !== 'boolean') {
			console.log(new TypeError(`disableResume must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disableLeave !== 'boolean') {
			console.log(new TypeError(`disableLeave must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disableClear !== 'boolean') {
			console.log(new TypeError(`disableClear must be a boolean`));
			process.exit(1);
		}
		if (typeof musicbot.disableLoop !== 'boolean') {
			console.log(new TypeError(`disableLoop must be a boolean`));
			process.exit(1);
		}

		//Owner errors.
		if (typeof musicbot.ownerOverMember !== 'boolean') {
			console.log(new TypeError(`ownerOverMember must be a boolean`));
			process.exit(1);
		};
		if (musicbot.ownerOverMember && typeof musicbot.botOwner !== 'string') {
			console.log(new TypeError(`botOwner must be a string`));
			process.exit(1);
		};

		//musicbot.botPrefix errors.
		if (typeof musicbot.botPrefix !== 'string') {
			console.log(new TypeError(`prefix must be a string`));
			process.exit(1);
		};
		if (musicbot.botPrefix.length < 1 || musicbot.botPrefix.length > 10) {
			console.log(new RangeError(`prefix length must be between 1 and 10`));
			process.exit(1);
		};

		//musicbot.global errors.
		if (typeof musicbot.global !== 'boolean') {
			console.log(new TypeError(`global must be a boolean`));
			process.exit(1);
		};

		//musicbot.maxQueueSize errors.
		if (typeof musicbot.maxQueueSize !== 'number') {
			console.log(new TypeError(`maxQueueSize must be a number`));
			process.exit(1);
		};
		if (!Number.isInteger(musicbot.maxQueueSize) || musicbot.maxQueueSize < 1) {
			console.log(new TypeError(`maxQueueSize must be an integer more than 0`));
			process.exit(1);
		};

		//DEFAULT_VOLUME errors.
		if (typeof musicbot.defVolume !== 'number') {
			console.log(new TypeError(`defaultVolume must be a number`));
			process.exit(1);
		};
		if (!Number.isInteger(musicbot.defVolume) || musicbot.defVolume < 1 || musicbot.defVolume > 200) {
			console.log(new TypeError(`defaultVolume must be an integer between 1 and 200`));
			process.exit(1);
		};

		//musicbot.anyoneCanSkip errors.
		if (typeof musicbot.anyoneCanSkip !== 'boolean') {
			console.log(new TypeError(`anyoneCanSkip must be a boolean`));
			process.exit(1);
		};

		//CLEAR_INVOKER errors.
		if (typeof musicbot.clearInvoker !== 'boolean') {
			console.log(new TypeError(`clearInvoker must be a boolean`));
			process.exit(1);
		};

		//Command name errors.
		if (typeof musicbot.helpCmd !== 'string') {
			console.log(new TypeError(`helpCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.playCmd !== 'string') {
			console.log(new TypeError(`playCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.skipCmd !== 'string') {
			console.log(new TypeError(`skipCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.deleteCmd !== 'string') {
			console.log(new TypeError(`deleteCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.queueCmd !== 'string') {
			console.log(new TypeError(`queueCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.pauseCmd !== 'string') {
			console.log(new TypeError(`pauseCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.resumeCmd !== 'string') {
			console.log(new TypeError(`resumeCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.volumeCmd !== 'string') {
			console.log(new TypeError(`volumeCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.leaveCmd !== 'string') {
			console.log(new TypeError(`leaveCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.clearCmd !== 'string') {
			console.log(new TypeError(`clearCmd must be a string`));
			process.exit(1);
		};
		if (typeof musicbot.loopCmd !== 'string') {
			console.log(new TypeError(`loopCmd must be a string`));
			process.exit(1);
		};

		//musicbot.enableQueueStat errors.
		if (typeof musicbot.enableQueueStat !== 'boolean') {
			console.log(new TypeError(`enableQueueStat must be a boolean`));
			process.exit(1);
		};

		//musicbot.anyoneCanAdjust errors.
		if (typeof musicbot.anyoneCanAdjust !== 'boolean') {
			console.log(new TypeError(`anyoneCanAdjust must be a boolean`));
			process.exit(1);
		};

		if (typeof musicbot.logging !== 'boolean') {
			console.log(new TypeError(`logging must be a boolean`));
			process.exit(1);
		}

		//Misc.
		if (musicbot.global && musicbot.maxQueueSize < 50) console.warn(`global queues are enabled while maxQueueSize is below 50! Recommended to use a higher size.`);
	};
}
