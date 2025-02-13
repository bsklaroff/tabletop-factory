export interface Player {
  id: string
  name: string
}

export interface GameFSMData<S, A> {
  players: Player[]
  initState: S
  state: S
  actionHistory: A[]
  historyDisplay: string[]
}

export abstract class GameFSM<S, A> {
  players: Player[]
  initState: S
  state: S
  actionHistory: A[]
  historyDisplay: string[]
  static minPlayers: number = 2
  static maxPlayers: number = 2

  constructor(arg: Player[] | GameFSMData<S, A>) {
    if (Array.isArray(arg)) {
      const players = structuredClone(arg)
      const ThisClass = this.constructor as typeof GameFSM
      if (players.length < ThisClass.minPlayers || players.length > ThisClass.maxPlayers) {
        throw new Error(`Invalid number of players: ${players.length}`)
      }
      this.initState = this.newInitState(players.length)
      this.state = structuredClone(this.initState)
      this.players = players
      this.actionHistory = []
      this.historyDisplay = []
    } else {
      const gameFSMData = structuredClone(arg)
      this.initState = gameFSMData.initState
      this.state = gameFSMData.state
      this.players = gameFSMData.players
      this.actionHistory = gameFSMData.actionHistory
      this.historyDisplay = gameFSMData.historyDisplay
    }
  }

  toData(): GameFSMData<S, A> {
    return {
      initState: this.initState,
      state: this.state,
      players: this.players,
      actionHistory: this.actionHistory,
      historyDisplay: this.historyDisplay,
    }
  }

  rewindTo(actionIdx: number): void {
    const actionsToReplay = this.actionHistory.slice(0, actionIdx + 1)
    this.state = structuredClone(this.initState)
    this.actionHistory = []
    this.historyDisplay = []
    for (const action of actionsToReplay) {
      this.takeAction(action)
    }
  }

  undo(): void {
    this.rewindTo(this.actionHistory.length - 2)
  }

  copy(): typeof this {
    const ThisClass = this.constructor as new (arg: GameFSMData<S, A>) => typeof this
    return new ThisClass(this.toData())
  }

  addToDisplay(displayString: string): void {
    const actionIdx = this.actionHistory.length
    while (this.historyDisplay.length <= actionIdx) {
      this.historyDisplay.push('')
    }
    let prevDisplayString = this.historyDisplay[actionIdx]
    if (prevDisplayString.length > 0) {
      prevDisplayString += '\n'
    }
    this.historyDisplay[actionIdx] = prevDisplayString + displayString
  }

  abstract newInitState(numPlayers: number): S
  abstract takeAction(action: A): boolean
  abstract hasEnded(): boolean
}

