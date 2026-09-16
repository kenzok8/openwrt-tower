// Command tower is the OpenWrt backend for the luci-app-tower plugin.
//
// With no subcommand it runs the HTTP daemon; with a subcommand it acts as a
// CLI, so the LuCI frontend can drive the same logic through subprocess calls.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/kenzok8/tower/internal/api"
	"github.com/kenzok8/tower/internal/model"
	"github.com/kenzok8/tower/internal/service"
	"github.com/kenzok8/tower/internal/store"
)

func main() {
	dataDir := flag.String("data", "/etc/tower", "data directory for persistent state")
	listen := flag.String("listen", "127.0.0.1:7443", "HTTP listen address (daemon mode)")
	flag.Parse()

	st := store.New(*dataDir)
	svc := service.New(st)

	if flag.NArg() == 0 {
		runDaemon(*listen, svc)
		return
	}

	sub := flag.Arg(0)
	args := flag.Args()[1:]
	if err := runCLI(sub, args, svc); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func runDaemon(listen string, svc *service.Service) {
	srv := api.New(svc)
	log.Printf("tower daemon listening on %s (data: %s)", listen, svc.Store.Dir())
	if err := http.ListenAndServe(listen, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}

func runCLI(sub string, args []string, svc *service.Service) error {
	switch sub {
	case "subscriptions":
		state, err := svc.Store.Load()
		if err != nil {
			return err
		}
		return printJSON(state.Subscriptions)
	case "nodes":
		state, err := svc.Store.Load()
		if err != nil {
			return err
		}
		return printJSON(state.Nodes)
	case "add":
		fs := flag.NewFlagSet("add", flag.ExitOnError)
		name := fs.String("name", "", "subscription name")
		url := fs.String("url", "", "subscription URL")
		ua := fs.String("user-agent", "", "optional User-Agent")
		_ = fs.Parse(args)
		sub, err := svc.AddSubscription(*name, *url, *ua)
		if err != nil {
			return err
		}
		return printJSON(sub)
	case "remove":
		fs := flag.NewFlagSet("remove", flag.ExitOnError)
		id := fs.String("id", "", "subscription id")
		_ = fs.Parse(args)
		return svc.RemoveSubscription(*id)
	case "refresh":
		fs := flag.NewFlagSet("refresh", flag.ExitOnError)
		id := fs.String("id", "", "subscription id (empty = all)")
		_ = fs.Parse(args)
		results, err := svc.Refresh(*id)
		if err != nil {
			return err
		}
		return printJSON(results)
	case "import":
		fs := flag.NewFlagSet("import", flag.ExitOnError)
		file := fs.String("file", "", "path to the config file to import")
		_ = fs.Parse(args)
		var content []byte
		var err error
		if *file != "" {
			content, err = os.ReadFile(*file)
		} else {
			content, err = io.ReadAll(os.Stdin)
		}
		if err != nil {
			return err
		}
		n, err := svc.ImportNodes(string(content))
		if err != nil {
			return err
		}
		fmt.Println(n)
		return nil
	case "export":
		fs := flag.NewFlagSet("export", flag.ExitOnError)
		target := fs.String("target", "", "client target")
		protocols := fs.String("protocols", "", "comma-separated enabled protocols (empty = all)")
		nodes := fs.String("nodes", "", "comma-separated node ids (empty = all)")
		_ = fs.Parse(args)
		out, err := svc.Export(model.ClientTarget(*target), service.ParseProtocols(*protocols), service.ParseNodeIDs(*nodes))
		if err != nil {
			return err
		}
		fmt.Print(out)
		return nil
	default:
		return fmt.Errorf("unknown subcommand %q", sub)
	}
}

func printJSON(v any) error {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(b))
	return nil
}
