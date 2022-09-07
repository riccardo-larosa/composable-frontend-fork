#!/usr/bin/env ts-node
import { compileFromFile } from "json-schema-to-typescript"
import path from "path"
import fs from "fs-extra"
import chalk from "chalk"
import globby, { GlobbyOptions } from "globby"

interface Asset {
  from: string
  to: string
}

export async function jsonSchemaToDts(
  options: Partial<{
    assets: Asset[]
    resolveFrom: string
    verbose: boolean
    globbyOptions: GlobbyOptions
  }>
) {
  const {
    assets = [],
    resolveFrom = "out",
    verbose = false,
    globbyOptions = {},
  } = options
  console.log("Running json schema to dts script")
  let outDirResolve

  if (resolveFrom === "cwd") {
    outDirResolve = process.cwd()
  } else if (resolveFrom === "out") {
    const outDir = path.dirname("dist")

    if (!outDir) {
      verboseLog(
        chalk.red(
          `You should provide valid ${chalk.white("outdir")} or ${chalk.white(
            "outfile"
          )} for assets copy. received outdir:${outDir}, received outfile:${undefined}`
        ),
        verbose
      )

      return
    }

    outDirResolve = outDir
  } else {
    outDirResolve = resolveFrom
  }

  verboseLog(
    `Resolve assert to path from: ${path.resolve(outDirResolve)}`,
    verbose
  )

  for (const { to, from } of assets) {
    const pathsCopyFrom = await globby(from, {
      expandDirectories: false,
      onlyFiles: true,
      ...globbyOptions,
    })

    const deduplicatedPaths = [...new Set(pathsCopyFrom)]

    if (!deduplicatedPaths.length) {
      verboseLog(
        `No files matched using current glob pattern: ${chalk.white(
          from
        )}, maybe you need to configure globby by ${chalk.white(
          "options.globbyOptions"
        )}?`,
        verbose
      )
    }

    for (const fromPath of deduplicatedPaths) {
      keepStructureJSONConvertHandler(
        outDirResolve,
        from,
        fromPath,
        to,
        verbose
      )
    }
  }
  console.log("Completed json schema to dts script")
}

const BANNER_COMMENT =
  "/* tslint:disable */\n/**\n* This file was automatically generated by json schema to dts.\n* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,\n* and run the script to regenerate this file.\n*/"

function keepStructureJSONConvertHandler(
  outDir: string,
  rawFromPath: string,
  globbedFromPath: string,
  baseToPath: string,
  verbose = false
) {
  // we keep structure only when input from path ends with /**/*(.ext)
  // for \/* only, we use simple merge copy handler
  // we only support /**/* now
  // and /**/*.js?
  const { dir } = path.parse(rawFromPath)

  const startFragment = dir.replace(`/**`, "")

  const [, preservedDirStructure] = globbedFromPath.split(startFragment)

  const sourcePath = path.resolve(globbedFromPath)
  const composedDistDirPath = path.resolve(
    outDir,
    baseToPath,
    preservedDirStructure.slice(1)
  )

  compileFromFile(sourcePath, {
    bannerComment: BANNER_COMMENT,
  }).then((ts) => {
    const { name } = path.parse(sourcePath)
    fs.ensureDirSync(path.dirname(composedDistDirPath))
    fs.writeFileSync(`${path.parse(composedDistDirPath).dir}/${name}.d.ts`, ts)
  })

  verboseLog(
    `File copied: ${chalk.white(sourcePath)} -> ${chalk.white(
      composedDistDirPath
    )}`,
    verbose
  )
}

function verboseLog(msg: string, verbose: boolean, lineBefore = false) {
  if (!verbose) {
    return
  }
  console.log(chalk.blue(lineBefore ? "\ni" : "i"), msg)
}

jsonSchemaToDts({ assets: [{ from: process.argv[2], to: process.argv[3] }] })