interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  index: number;
}

class Swarm {
  particles: Particle[] = [];
  groups: {
    [s: string]: Particle[];
  } = {};
  size: {
    width: number;
    height: number;
  } = {
    width: 1400,
    height: 1000,
  };
  halfSize: {
    width: number;
    height: number;
  } = {
    width: this.size.width / 2,
    height: this.size.height / 2,
  };

  colorMap: { [s: string]: number[] } = {
    yellow: [1, 1, 0],
    red: [1, 0, 0],
    green: [0, 0.2, 0],
    blue: [0, 0, 0.2],
  };

  constructor(width: number = 1400, height: number = 1000) {
    this.size.width = width;
    this.size.height = height;
    this.halfSize.width = width / 2;
    this.halfSize.height = height / 2;
    this.init();
  }

  init() {
    this.create(600, "yellow");
    this.create(600, "red");
    this.create(600, "green");
    this.create(600, "blue");
  }

  allRules(delta: number) {
    // const rules = [
    //   ["red", "red", -1],
    //   ["red", "yellow", -0.1],
    //   ["yellow", "red", 0.1],
    // ] as [string, string, number][];

    const rules = [
      ["red", "red", -1],
      ["yellow", "red", -2.5],
      ["green", "green", -1],
      ["green", "red", 1],
      ["red", "green", -1],
      ["blue", "red", 1],
      ["blue", "green", -1],
      ["blue", "blue", -5],
    ] as [string, string, number][];

    for (let i = 0; i < rules.length; i++) {
      this.rule(rules[i][0], rules[i][1], rules[i][2] * delta * 2);
    }
  }

  rule(color1: string, color2: string, g: number) {
    const particles1 = this.groups[color1];
    const particles2 = this.groups[color2];
    for (let i = 0; i < particles1.length; i++) {
      const a = particles1[i];
      let fx = 0;
      let fy = 0;
      let n = 0;
      for (let j = 0; j < particles2.length; j++) {
        const b = particles2[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0 && d < 90) {
          const f = g * (1 / d);
          fx += f * dx;
          fy += f * dy;
          n += 1;
        }
      }
      a.vx = a.vx + fx;
      a.vy = a.vy + fy;

      a.vx *= 0.7;
      a.vy *= 0.7;

      // const vRange = 20;
      // if (a.vx > vRange) {
      //   a.vx = vRange;
      // }
      // if (a.vx < -vRange) {
      //   a.vx = -vRange;
      // }
      // if (a.vy > vRange) {
      //   a.vy = vRange;
      // }
      // if (a.vy < -vRange) {
      //   a.vy = -vRange;
      // }

      a.x += a.vx;
      a.y += a.vy;

      if (a.x > this.halfSize.width) {
        a.vx = -Math.abs(a.vx);
      }
      if (a.x < -this.halfSize.width) {
        a.vx = Math.abs(a.vx);
      }
      if (a.y > this.halfSize.height) {
        a.vy = -Math.abs(a.vy);
      }
      if (a.y < -this.halfSize.height) {
        a.vy = Math.abs(a.vy);
      }

      //
      // if (a.x > this.halfSize.width) {
      //   a.x = -this.halfSize.width;
      // }
      // if (a.x < -this.halfSize.width) {
      //   a.x = this.halfSize.width;
      // }
      // if (a.y > this.halfSize.height) {
      //   a.y = -this.halfSize.height;
      // }
      // if (a.y < -this.halfSize.height) {
      //   a.y = this.halfSize.height;
      // }
    }
  }

  create(count: number, color: string) {
    const group: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        x: Math.random() * this.size.width - this.size.width / 2,
        y: Math.random() * this.size.height - this.size.height / 2,
        vx: 0,
        vy: 0,
        color,
        index: i,
      };
      this.particles.push(particle);
      group.push(particle);
    }
    this.groups[color] = group;
  }
}

export default Swarm;
