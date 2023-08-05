/* eslint-disable no-console */

// This script scrapes all the postal code files from https://download.geonames.org/export/zip/, downloads and extracts them to the Postal Codes directory.

import { mkdirSync, unlinkSync, createWriteStream } from "fs";
import { join, resolve } from "path";
import { finished as _finished } from "stream";
import { promisify } from "util";
import axios from "axios";
import { load } from "cheerio";
import extract from "extract-zip";

const DIRECTORY = "./Postal Codes";
const SOURCE_URL = "https://download.geonames.org/export/zip/";

// Create the output directory if it doesn't exist
mkdirSync(DIRECTORY, { recursive: true });

// Download the readme file
const README_FILE = "readme.txt";
downloadFile(SOURCE_URL + README_FILE, join(DIRECTORY, README_FILE));

// Get all the zip files to download
const zipFilesToDownload = await getPostalCodeFiles(SOURCE_URL);

// Download and extract the files
downloadAndExtractFiles(SOURCE_URL, zipFilesToDownload, DIRECTORY);

// Scrape all links to zip files from the source URL
async function getPostalCodeFiles(sourceUrl) {
  console.log(`Getting postal code zip files from '${sourceUrl}'`);
  const response = await axios.get(sourceUrl);
  const $ = load(response.data);
  const zipFiles = $("a")
    .map((i, el) => $(el).text())
    .get()
    .filter((fileName) => fileName.endsWith(".zip"));
  console.log(`Found ${zipFiles.length} zip files`);
  return zipFiles;
}

async function downloadAndExtractFiles(sourceUrl, filesToDownload, directory) {
  console.log(
    `Downloading ${filesToDownload.length} file(s) from '${sourceUrl}' to '${directory}'...`
  );
  filesToDownload.forEach(async (fileName) => {
    const downloadUrl = sourceUrl + fileName;
    const filePath = join(directory, fileName);
    // Download the file
    await downloadFile(downloadUrl, filePath);
    // Extract the file
    await extractZipFile(filePath, directory);
    // Delete the zip file
    console.log(`Deleting '${filePath}'`);
    unlinkSync(filePath);
  });
}

// Download a file from the given URL, save to the given file path, and wait for the download to finish
async function downloadFile(fileUrl, outputPath) {
  try {
    console.log(`Downloading '${fileUrl}' to '${outputPath}'`);
    // Initialize the writer stream
    const writer = createWriteStream(outputPath);
    const finished = promisify(_finished);
    // Download the file
    const response = await axios({
      method: "get",
      url: fileUrl,
      responseType: "stream",
    });
    // Pipe the response to the file writer
    response.data.pipe(writer);
    // Wait for the download to finish
    await finished(writer);
    // Log the result
    // const fileName = path.basename(outputPath);
    // console.log(`Finished downloading '${fileName}'`);
  } catch (error) {
    console.error(`Failed to download '${fileUrl}'`, error);
  }
}

// Extract a zip file to the given directory and wait for the extraction to finish
async function extractZipFile(zipFilePath, outputDirectory) {
  try {
    // Get absolute directory path
    const absoluteDirectory = resolve(outputDirectory);
    // Extract the file
    console.log(`Extracting '${zipFilePath}' to '${absoluteDirectory}'`);
    await extract(zipFilePath, { dir: absoluteDirectory });
    // Log the result
    // const fileName = path.basename(zipFilePath);
    // console.log(`Finished extracting '${fileName}'`);
  } catch (error) {
    console.error(`Failed to extract '${zipFilePath}'`, error);
  }
}
