var MAX_RANK = 1000;
var SRC_SHEET_NAME = 'シート1';
var RANK_SHEETNAME = 'rank';

//example
/// RandomPickerPre()
///  ...
///  RandomPicker(1),
///  RandomPicker(2)
///  ...
/// RandomPickerPost()

export function RandomPickerPre() {
  const srcSheet = SRC_SHEET_NAME;
  const diff = DiffSheet(srcSheet);
  SyncRankSheet(diff[0], diff[1]);
}

export function RandomPickerPost() {
  WriteRanks();
}

function RankFunction(rank: number, date: string) {
  const now = new Date();
  const d2 = new Date(date);
  const diff = Math.abs(now.getTime() - d2.getTime());
  const subDays = Math.ceil(diff / (1000 * 3600 * 24));
  return subDays / 2 + 1 / rank;
}

function WriteRanks() {
  const sheet = GetRankSheet();
  const vs = sheet.getRange(1, 3, sheet.getLastRow(), 2).getValues();
  sheet.getRange(1, 7, sheet.getLastRow(), 1).setValues(
    vs.map((x: object[]) => {
      return [RankFunction(x[0], x[1])];
    })
  );
}

function GetRow(row: number, destructive: boolean): any {
  const sheet = GetRankSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 0) {
    return null;
  }
  let rang = sheet.getRange(row, 1, 1, 4);
  let vals = rang.getValues();
  //Logger.log(vals);
  vals[0][2] = vals[0][2] + 1 / vals[0][2];
  vals[0][3] = new Date();
  if (destructive) {
    rang.setValues(vals);
  }

  let allRanks = sheet.getRange(1, 3, sheet.getLastRow(), 3);
  const rankvals = allRanks.getValues();
  const sum = rankvals.reduce((acc: number, c: number[]) => {
    return acc + c[0];
  }, 0);

  //Logger.log("sum %s , rankvals %s",sum,rankvals);
  if (destructive && sum > MAX_RANK) {
    allRanks.setValues(
      rankvals.map(
        (x: number[]): number[] => {
          x[0] *= 0.9;
          return x;
        }
      )
    );
  }
  return vals[0];
}

function _RandomPickerCore(category) {
  const range = CategoryRowRange()[category];
  const sheet = GetRankSheet();
  const val = sheet
    .getRange(range[0], 3, range[1] - range[0] + 1, 2)
    .getValues();
  const allRanks = val.map(x => {
    return RankFunction(x[0], x[1]);
  });
  return RandSelect(allRanks) + range[0];
  // return GetRow(randRow)[0];
}

// 昔のやつn
function RandomPicker(category): string {
  const randRow = _RandomPickerCore(category);
  return GetRow(randRow, true)[0];
}

// 今のやつ
// var r= RandomPickSafe(ctgy)
// RandomPickSafe(ctgy,r[0])
export function RandomPickSafe(category: number) {
  var randRow = _RandomPickerCore(category);
  var r = GetRow(randRow, false);
  return [randRow, r];
}

export function RandomPickCommit(category: number, row: number) {
  return GetRow(row, true)[0];
}

function CategoryRowRange() {
  const sheet = GetRankSheet();
  const val = sheet.getRange(1, 2, sheet.getLastRow(), 1).getValues();
  let old: number = val[0][0];
  let rangeBegin = 1;
  let ret = {};

  for (var i = 0; i < val.length; i++) {
    var v = val[i][0];
    if (v === null || v === old) {
      continue;
    }
    ret[old] = [rangeBegin, i];
    old = val[i][0];
    rangeBegin = i + 1;
  }
  ret[old] = [rangeBegin, i];
  //Logger.log(ret)
  return ret;
}

function RandSelect(weightArr: number[]): number {
  const wi = CreateWeightSection(weightArr);
  const vv = new Array(weightArr.length);
  for (let j = 0; j < weightArr.length; j++) {
    vv[j] = 0;
  }
  var rand = Math.random() * wi[wi.length - 1];
  return Bisect(rand, wi, 0, weightArr.length);
}

function CreateWeightSection(arr: number[]): number[] {
  const sums: number[] = new Array(arr.length + 1);
  let tmp = 0;
  sums[0] = 0;
  for (let i = 0; i < arr.length; i++) {
    tmp += arr[i];
    sums[i + 1] = tmp;
  }
  return sums;
}

function Bisect(
  target: number,
  arr: number[],
  begin: number,
  end: number
): number {
  const mid = Math.floor((begin + end) / 2);
  if (begin >= mid) {
    return mid;
  }
  var midVal = arr[mid];
  if (target === midVal) {
    return mid;
  } else if (target < midVal) {
    return Bisect(target, arr, begin, mid);
  } else {
    return Bisect(target, arr, mid, end);
  }
}

function GetSrcSheetValue(name) {
  const sp = SpreadsheetApp.openById(SHEET_ID);
  const sheet = sp.getSheetByName(name);
  let di = {};
  for (var i = 0; i < sheet.getLastColumn(); i++) {
    var cols = sheet.getRange(2, i + 1, sheet.getLastRow());
    var colvals = cols
      .getValues()
      .map(x => {
        return x[0];
      })
      .filter(x => {
        return x;
      });
    di[i + 1] = colvals;
  }
  return di;
}

function GetRankSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  //var RankSheetName = RANK_SHEETNAME;
  const sheet = SpreadsheetApp.openById(SHEET_ID);
  let s = sheet.getSheetByName(RANK_SHEETNAME);
  //Logger.log(s);
  if (s === null) {
    s = sheet.insertSheet(RANK_SHEETNAME);
  }
  return s;
}

function DiffSheet(srcname): object[] {
  let src = GetSrcSheetValue(srcname);
  const rank = ImportRankSheet();
  let addSet = []; // [[name,col],[.,.] ...]
  let delSet = []; // [line,...]
  let intersection = [];
  const keys = Object.keys(src)
    .concat(Object.keys(rank))
    .filter((v, i, self) => {
      return self.indexOf(v) === i;
    });
  //Logger.log(keys);
  for (const s of keys) {
    const sv = src[s];
    if (!(s in rank)) {
      for (const si of sv) {
        addSet.push([si, s]);
      }
      continue;
    }

    const rv = rank[s];
    const r = rank[s].map((x: object[]) => {
      return x[0];
    });
    if (!(s in src)) {
      for (const rvi of rv) {
        delSet.push(rvi[1]);
      }
      continue;
    }
    for (const ri of r) {
      if (sv.includes(ri)) {
        intersection.push(ri);
      }
    }
    for (let i = 0; i < r.length; i++) {
      if (!intersection.includes(r[i])) {
        delSet.push(rv[i][1]);
      }
    }

    for (let i = 0; i < sv.length; i++) {
      if (!intersection.includes(sv[i])) {
        addSet.push([sv[i], s]);
      }
    }
  }
  return [addSet, delSet];
}

function ImportRankSheet() {
  const sheet = GetRankSheet();
  //var sheet = SpreadsheetApp.getActive().getSheetByName(name);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 0) {
    return {};
  }
  const vals = sheet
    .getRange(1, 1, lastRow, 2)
    .getValues()
    .filter((x: object[]) => {
      return x.some((y: object, i: number, ar: object[]) => {
        return x.includes(y);
      });
    });

  let ret = {};
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    const ca: string = v[1];
    if (!(ca in ret)) {
      ret[ca] = [];
    }
    ret[ca].push([v[0], i + 1]);
  }
  return ret;
}

function SyncRankSheet(addSet, delSet) {
  DeleteRankSheet(delSet);
  AddRankSheet(addSet);
  UniqRankSheet();
}

function DeleteRankSheet(rows) {
  let sheet = GetRankSheet();
  for (let i = 0; i < rows.length; i++) {
    sheet.deleteRow(rows[i]);
  }
}

function AddRankSheet(ar) {
  if (ar.length <= 0) {
    return;
  }
  const sheet = GetRankSheet();
  let arr = [];
  const now = new Date();
  for (let i = 0; i < ar.length; i++) {
    arr.push([ar[i][0], ar[i][1], 1, now]);
  }
  let rang = sheet.getRange(sheet.getLastRow() + 1, 1, arr.length, 4);
  rang.setValues(arr);
}

function UniqRankSheet(): void {
  const sheet = GetRankSheet();
  if (sheet.getLastRow() <= 0) {
    return;
  }
  let rang = sheet.getRange(1, 1, sheet.getLastRow(), 4);
  rang.sort([{ column: 2 }, { column: 1 }]);
  const vals = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
  let old = [null, null];
  let duplicate = [];

  for (var i = 0; i < vals.length; i++) {
    if (old[0] === vals[i][0] && old[1] === vals[i][1]) {
      duplicate.push(i);
    }
    old = vals[i];
  }
  DeleteRankSheet(duplicate);
}

// Array.prototype.includes() のpolyfill
// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      // 1. Let O be ? ToObject(this value).
      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If len is 0, return false.
      if (len === 0) {
        return false;
      }

      // 4. Let n be ? ToInteger(fromIndex).
      //    (If fromIndex is undefined, this step produces the value 0.)
      var n = fromIndex | 0;

      // 5. If n ≥ 0, then
      //  a. Let k be n.
      // 6. Else n < 0,
      //  a. Let k be len + n.
      //  b. If k < 0, let k be 0.
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      function sameValueZero(x, y) {
        return (
          x === y ||
          (typeof x === 'number' &&
            typeof y === 'number' &&
            isNaN(x) &&
            isNaN(y))
        );
      }

      // 7. Repeat, while k < len
      while (k < len) {
        // a. Let elementK be the result of ? Get(O, ! ToString(k)).
        // b. If SameValueZero(searchElement, elementK) is true, return true.
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        // c. Increase k by 1.
        k++;
      }

      // 8. Return false
      return false;
    }
  });
}
