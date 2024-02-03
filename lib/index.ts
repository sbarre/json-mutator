import randomstring from 'randomstring';
import jp from 'jsonpath';

type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;

type ScramblerOptions = {
  chaos?: number;
  canBeNull?: boolean;
  nullOdds?: number;
  preservedKeys?: string[];
  preserveAllKeys?: boolean;
  wildKeys?: boolean;
  startingPoint?: string;
  scrambleStructureOnly?: boolean;
}

class Scrambler {

  heat: number = 10;
  startingOdds: number = 100;

  arrayOperatorOdds = {
    addElement: 5,
    removeElement: 5,
    swapElements: 100
  };

  arrayOperatorMaximums = {
    addElement: 2,
    removeElement: 0,
    swapElements: 3
  }

  objectOperatorOdds = {
    addElement: 100,
    removeElement: 5,
  };

  objectOperatorMaximums = {
    addElement: 2,
    removeElement: 0,
  }


  maxStringLengths: number[] = [10,50,100,1000];
  minNumber: number = 0;
  maxNumbers: number[] = [10,100,100000,100000000000]

  chaos: number;
  canBeNull: boolean;
  maxNulls: number = 5;

  parsed: Object;
  toScramble: Object = {};
  scrambled: Object = {};
  
  odds: number;

  nullOdds: number;

  asString: boolean;

  wildKeys: boolean;

  preservedKeys: any[];
  preserveAllKeys: boolean;

  scrambleStructureOnly: boolean;

  startingPoint: string;

  constructor(json: any, options: ScramblerOptions = {}) {

    this.nullOdds = (options.nullOdds !== undefined) ? options.nullOdds : 5;
    this.odds = this.startingOdds;
    this.chaos = (options.chaos !== undefined) ? options.chaos :  10;
    this.canBeNull = options.canBeNull || true;
    this.wildKeys = options.wildKeys || false;

    this.preservedKeys = options.preservedKeys || [];
    this.preserveAllKeys = options.preserveAllKeys || false;
    this.scrambleStructureOnly = options.scrambleStructureOnly || false;
    if (this.scrambleStructureOnly) this.preserveAllKeys = true;

    this.startingPoint = options.startingPoint || '';

    this.parsed = (typeof json === 'string') ? JSON.parse(json) : json ;

    if (this.startingPoint !== '') {
      this.toScramble = jp.query(this.parsed, this.startingPoint)[0];
    } else {
      this.toScramble = this.parsed;
    }

    //console.log(this.parsed,this.toScramble);

    this.asString = (typeof json === 'string') ? true : false;

  }

  scramble() {

    let doc: any = JSON.parse(JSON.stringify(this.toScramble));

    if (Array.isArray(doc)) {
      doc = this.arrayMutate(doc, false);
    } else if (typeof doc === 'object') {
      doc = this.objectMutate(doc, false);
    } else if (typeof doc === 'number') {
      doc = this.numberMutate(doc, false);
    } else if (typeof doc === 'string') {
      doc = this.stringMutate(doc, false);
    }
  
    if (this.startingPoint !== '') {
      const parsed = JSON.parse(JSON.stringify(this.parsed));
      const result  = jp.apply(parsed, this.startingPoint, () => doc);
      this.scrambled = parsed;
    } else {
      this.scrambled = doc;
    }

    return (this.asString) ? JSON.stringify(this.scrambled) : this.scrambled;
  
  }

  checkNullOdds() {
    const random = Math.floor(Math.random() * 100);
    return random < this.nullOdds;
  }

  doMutation() : boolean {
    const random = Math.floor(Math.random() * this.odds);
    if (random < this.chaos) {
      this.odds = this.startingOdds;
      return true;
    } else {
      this.odds = this.odds - Math.floor(this.odds / this.heat);
      return false;
    }
  }

  arrayMutate(arr: any[], canBeNull: boolean): Array<any> | null {
    let newArr: any[] = JSON.parse(JSON.stringify(arr));

    let addElement = Math.floor(Math.random() * 100) < this.arrayOperatorOdds.addElement;
    let removeElement = Math.floor(Math.random() * 100) < this.arrayOperatorOdds.removeElement;
    let swapElements = Math.floor(Math.random() * 100) < this.arrayOperatorOdds.swapElements;

    for (let i = 0; i < newArr.length; i++) {

      if (Array.isArray(newArr[i])) {
        newArr[i] = JSON.parse(JSON.stringify(this.arrayMutate(newArr[i], this.canBeNull)));
      } else if (typeof newArr[i] === 'object') {
        newArr[i] = JSON.parse(JSON.stringify(this.objectMutate(newArr[i], this.canBeNull)));
      } else if (typeof newArr[i] === 'number') {
        newArr[i] = this.numberMutate(newArr[i], this.canBeNull);
      } else if (typeof newArr[i] === 'string') {
        newArr[i] = this.stringMutate(newArr[i], this.canBeNull);
      } else {
        newArr[i] = newArr[i];
      }
  
    }

    if (this.doMutation()) {

      if (removeElement && newArr.length > 0) {
        const numElements = Math.floor(Math.random() * this.arrayOperatorMaximums.removeElement) + 1;
        for (let i=0; i < numElements; i++) {
          newArr.splice(Math.floor(Math.random() * newArr.length), 1);
        }
      }

      if (addElement) {
        const numElements = Math.floor(Math.random() * this.arrayOperatorMaximums.addElement) + 1;
        for (let i=0; i < numElements; i++) {
          const newEl = this._getRandomElement(true);
          const newIndex = Math.floor(Math.random() * newArr.length);
          newArr.splice(newIndex, 0, newEl);
          if (Array.isArray(newEl)) {
            newArr[newIndex] = this.arrayMutate(newArr[newIndex], this.canBeNull);
          }
        }
      }

      if (swapElements && newArr.length > 1) {
        const numElements = Math.floor(Math.random() * this.arrayOperatorMaximums.swapElements) + 1;
        for (let i=0; i < numElements; i++) {
          let index1 = Math.floor(Math.random() * newArr.length);
          let index2 = Math.floor(Math.random() * newArr.length);
          if (index1 == index2) {
            index2 = (index2 > 0) ? index2-- : index2++;
          }
          const temp = newArr[index1];
          newArr[index1] = newArr[index2];
          newArr[index2] = temp;
        }
      }

    }

    return (canBeNull && this.checkNullOdds()) ? null : newArr;
  }
  
  objectMutate(obj: any, canBeNull: boolean): any | null {
    let newObj = JSON.parse(JSON.stringify(obj));

    let addElement = Math.floor(Math.random() * 100) < this.objectOperatorOdds.addElement;
    let removeElement = Math.floor(Math.random() * 100) < this.objectOperatorOdds.removeElement;

    const newObjKeys = Object.keys(newObj) as Array<keyof typeof newObj>;

    newObjKeys.forEach((key) => {

      let k = (this.preservedKeys.includes(key) || this.preserveAllKeys) ? key : (this.doMutation() ? this._generateString(this.wildKeys) : key );
      if (Array.isArray(newObj[key])) {
        newObj[k] = JSON.parse(JSON.stringify(this.arrayMutate(newObj[key], this.canBeNull)));
        if (k !== key) delete newObj[key];
      } else if (typeof newObj[key] === 'object') {
        newObj[k] = JSON.parse(JSON.stringify(this.objectMutate(newObj[key], this.canBeNull)));
        if (k !== key) delete newObj[key];
      } else if (typeof newObj[key] === 'number') {
        newObj[k] = this.numberMutate(newObj[key], this.canBeNull);
        if (k !== key) delete newObj[key];
      } else if (typeof newObj[key] === 'string') {
        newObj[k] = this.stringMutate(newObj[key], this.canBeNull);
        if (k !== key) delete newObj[key];
      }
  
    });

    const currentObjKeys = Object.keys(newObj) as Array<keyof typeof newObj>;

    if (this.doMutation()) {

      if (removeElement && currentObjKeys.length > 0) {
        const numElements = Math.floor(Math.random() * this.objectOperatorMaximums.removeElement) + 1;
        for (let i=0; i < numElements; i++) {
          const key = currentObjKeys[Math.floor(Math.random() * currentObjKeys.length)];
          delete newObj[key];
        }
      }

      if (addElement) {
        const numElements = Math.floor(Math.random() * this.objectOperatorMaximums.addElement) + 1;
        for (let i=0; i < numElements; i++) {
          const newKey = this._generateString(this.wildKeys);
          const newVal = this._getRandomElement(true);
          newObj[newKey] = newVal;
        }
      }
    
    }

    return (canBeNull && this.checkNullOdds()) ? null : newObj;
  }
  
  numberMutate(num: number, canBeNull: boolean): number | null {
    if (this.doMutation() && !this.scrambleStructureOnly) {
      return (canBeNull && this.checkNullOdds()) ? null : this._generateNumber();
    }
    return num;
  }
  
  stringMutate(str: string, canBeNull: boolean): string  | null {
    let newStr: string | null = str;
    if (this.doMutation() && !this.scrambleStructureOnly) {
      newStr = (canBeNull && this.checkNullOdds()) ? null : this._generateString();
    }
    return newStr;
  }

  _getRandomElement(includeArrays: boolean = false): any {
    const max = (includeArrays) ? 3 : 2;
    const flip = Math.floor(Math.random() * max);

    switch (flip) {
      case 0:
        return this._generateString();
      case 1:
        return this._generateNumber();
      case 2:
        return this._generateArray();
    }
  }

  _generateArray(): Array<any> {
    return [];
  }

  _generateNumber(): number {
    return Math.floor(Math.random() * this.maxNumbers[Math.floor(Math.random() * this.maxNumbers.length)] - this.minNumber) + this.minNumber;
  }

  _generateString(wild: boolean = true): string {

    const wildChars = (wild) ? ['alphanumeric', '    !@#$%^&*()_+{}|:<>?/.,;[]-=\\~`'] : ['alphanumeric'];
    const arrLength = (wild) ? this.maxStringLengths.length : this.maxStringLengths.length - 2;

    return randomstring.generate({
      length: Math.floor(Math.random() * this.maxStringLengths[Math.floor(Math.random() * arrLength)]), 
      charset: wildChars});
  }

}

export default function scramble(json: string | Object, options: ScramblerOptions): string | Object {
  return (new Scrambler(json, options)).scramble();
}