export interface Player {
  id: string
  name: string
}

export interface GameFSMData<S, A> {
  players: Player[]
  initState: S
  state: S
  actionHistory: A[]
  displayStrings: string[]
}

export abstract class GameFSM<S extends GameState, A extends GameAction> {
  players: Player[]
  initState: S
  state: S
  actionHistory: A[]
  displayStrings: string[]
  static minPlayers: number = 2
  static maxPlayers: number = 2

  constructor(arg: Player[] | GameFSMData<S, A>) {
    if (Array.isArray(arg)) {
      const players = arg
      const ThisClass = this.constructor as typeof GameFSM
      if (players.length < ThisClass.minPlayers || players.length > ThisClass.maxPlayers) {
        throw new Error(`Invalid number of players: ${players.length}`)
      }
      this.initState = this.newInitState(players.length)
      this.state = structuredClone(this.initState)
      this.players = players
      this.actionHistory = []
      this.displayStrings = []
    } else {
      const gameFSMData = arg
      this.initState = gameFSMData.initState
      this.state = gameFSMData.state
      this.players = gameFSMData.players
      this.actionHistory = gameFSMData.actionHistory
      this.displayStrings = gameFSMData.displayStrings
    }
  }

  toData(): GameFSMData<S, A> {
    return {
      initState: this.initState,
      state: this.state,
      players: this.players,
      actionHistory: this.actionHistory,
      displayStrings: this.displayStrings,
    }
  }

  undoAction(n?: number) {
    const actionsToReplay = this.actionHistory.slice(0, n !== undefined ? -n : -1)
    this.state = structuredClone(this.initState)
    this.actionHistory = []
    this.displayStrings = []
    for (const action of actionsToReplay) {
      this.takeAction(action)
    }
  }

  addToDisplay(displayString: string): void {
    this.displayStrings.push(displayString)
  }

  abstract newInitState(numPlayers: number): S
  abstract takeAction(action: A): boolean
  abstract hasEnded(): boolean
}

