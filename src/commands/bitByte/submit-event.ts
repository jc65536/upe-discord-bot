const Byte = require("../../schemas/byte");
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getEventPoints } from "../../functions/get-points";
const mongoose = require("mongoose");
const download = require("image-downloader");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("submit")
    .setDescription("Get points for events with your bits!")
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("Where did you hang out?")
        .setRequired(true)
        .addChoices(
          { name: "On-campus", value: "campus" },
          { name: "Westwood", value: "westwood" },
          { name: "LA", value: "la" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("caption")
        .setDescription("Brief summary of what you did")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("members")
        .setDescription("How many bits attended?")
        .setRequired(true)
        .setMinValue(1)
    )
    .addAttachmentOption((option) =>
      option
        .setName("picture")
        .setDescription("Please attach a picture of the event")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("byte")
        .setDescription("The byte to get the points for")
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const num_attended = interaction.options.getInteger("members");

    const userBehalf = interaction.options.getUser("byte") ?? interaction.user;
    const byte = await Byte.findOne({ byte_ids: userBehalf.id });
    if (!byte) {
      await interaction.reply({
        content: `Error: ${userBehalf.username} is not one of the recognized bytes.`,
        ephemeral: true,
      });
      return;
    }

    const newEvent = {
      location: interaction.options.getString("location")!,
      num_mems: num_attended!,
      pic: interaction.options.getAttachment("picture")?.url!,
      caption: interaction.options.getString("caption")!,
      date: interaction.createdAt!,
    };

    if (byte.total_mems < num_attended!) {
      await interaction.reply({
        content: `Error: There are less than ${num_attended} inductees in your byte.`,
      });
      return;
    }
    const IMAGES_DIR = "../../event-pics/";
    let imageFileName =
      Date.now() + newEvent.pic.substring(newEvent.pic.lastIndexOf("."));

    await download
      .image({
        url: newEvent.pic,
        dest: `${IMAGES_DIR + imageFileName}`,
        // extractFilename: false,
      })
      .then((filename: any) => { imageFileName = filename.filename })
      .catch((err: any) => console.error(err));

    // byte.events.push(newEvent)
    // await byte.save().catch(console.error)

    interaction
      .reply({
        content: `Location: ${interaction.options.getString(
          "location"
        )}\nPoints Earned: ${getEventPoints(newEvent, byte.total_mems)}`,
        files: [{ attachment: imageFileName }],
      })
      .then((msg) => { });

    await interaction
      .fetchReply()
      .then((reply) => {
        newEvent.pic = reply.attachments.first()?.proxyURL!;
      })
      .catch(console.error);

    byte.events.push(newEvent);
    await byte.save().catch(console.error);
  },
};
